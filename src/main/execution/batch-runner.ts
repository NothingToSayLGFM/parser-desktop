import { chromium } from 'playwright'
import { executeSteps } from './execution-engine'
import { readColumnValues } from './xlsx-reader'
import { resolveOutputPath } from './output-path'
import { writeRowsToXlsx } from './xlsx-writer'
import { findFlowById } from '../db/flows-repository'
import { createRun, finishRun } from '../db/run-history-repository'
import { isFlowRunning, setFlowRunning } from '../state/running-flows'
import type { BatchProgress, BatchRunResult, FieldMapping, FlowStep } from '../../shared/types'

let cancelRequested = false

export function requestBatchCancel(): void {
  cancelRequested = true
}

export async function runBatch(
  flowId: string,
  inputFilePath: string,
  inputColumnHeader: string,
  onProgress: (progress: BatchProgress) => void
): Promise<BatchRunResult> {
  cancelRequested = false

  const flow = findFlowById(flowId)
  if (!flow) {
    throw new Error('Флоу не знайдено')
  }

  const steps = JSON.parse(flow.stepsJson) as FlowStep[]
  const inputStep = steps.find((step) => step.type === 'fill' && step.isBatchInput)
  if (!inputStep) {
    throw new Error(
      'У флоу не позначено крок-параметр для пакетної обробки (кнопка "Параметр" на кроці FILL у Рекордері)'
    )
  }

  if (isFlowRunning(flowId)) {
    throw new Error('Флоу вже виконується')
  }

  const mapping = JSON.parse(flow.mappingJson) as FieldMapping[]
  const values = await readColumnValues(inputFilePath, inputColumnHeader)

  setFlowRunning(flowId, true)
  try {
    const run = createRun(flowId)
    const outputFilePath = resolveOutputPath(flow)

    const browser = await chromium.launch({ headless: true })
    const rows: Record<string, string>[] = []
    let succeeded = 0
    let failed = 0

    try {
      const context = await browser.newContext()
      const page = await context.newPage()

      for (let i = 0; i < values.length; i++) {
        if (cancelRequested) break

        try {
          const row = await executeSteps(page, steps, flow.stepTimeoutMs, {
            stepId: inputStep.id,
            value: values[i]
          })
          rows.push(row)
          succeeded++
        } catch {
          failed++
        }

        onProgress({ processed: i + 1, total: values.length, succeeded, failed })
      }
    } finally {
      await browser.close()
    }

    let writtenOutputFilePath: string | null = null
    if (rows.length > 0 && mapping.length > 0) {
      await writeRowsToXlsx(outputFilePath, mapping, rows)
      writtenOutputFilePath = outputFilePath
    }

    finishRun(run.id, {
      status: 'success',
      rowsCount: succeeded,
      errorMessage: failed > 0 ? `Пропущено з помилками: ${failed}` : null,
      outputFilePath: writtenOutputFilePath
    })

    return { succeeded, failed, outputFilePath: writtenOutputFilePath }
  } finally {
    setFlowRunning(flowId, false)
  }
}
