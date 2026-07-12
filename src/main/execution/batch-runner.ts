import { chromium } from 'patchright'
import { executeSteps } from './execution-engine'
import { isCaptchaPresent } from './captcha-detector'
import { resolveChromiumExecutablePath } from '../playwright-executable-path'
import { readColumnValues } from './xlsx-reader'
import { resolveOutputPath } from './output-path'
import { writeRowsToXlsx } from './xlsx-writer'
import { findFlowById } from '../db/flows-repository'
import { createRun, finishRun } from '../db/run-history-repository'
import { isFlowRunning, setFlowRunning } from '../state/running-flows'
import { setCaptchaPending } from '../state/captcha-flows'
import type { BatchProgress, BatchRunResult, FieldMapping, FlowStep } from '../../shared/types'

const cancelRequestedFlowIds = new Set<string>()
const captchaResumeResolvers = new Map<string, () => void>()

export function requestBatchCancel(flowId: string): void {
  cancelRequestedFlowIds.add(flowId)
  setCaptchaPending(flowId, false)
  captchaResumeResolvers.get(flowId)?.()
}

export function resumeAfterCaptcha(flowId: string): void {
  setCaptchaPending(flowId, false)
  captchaResumeResolvers.get(flowId)?.()
}

function waitForCaptchaResume(flowId: string): Promise<void> {
  return new Promise((resolve) => {
    captchaResumeResolvers.set(flowId, () => {
      captchaResumeResolvers.delete(flowId)
      resolve()
    })
  })
}

export async function runBatch(
  flowId: string,
  inputFilePath: string,
  inputColumnHeader: string,
  onProgress: (progress: BatchProgress) => void,
  onCaptcha: (flowId: string) => void
): Promise<BatchRunResult> {
  cancelRequestedFlowIds.delete(flowId)

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

    const browser = await chromium.launch({
      headless: false,
      executablePath: resolveChromiumExecutablePath()
    })
    const rows: Record<string, string>[] = []
    let succeeded = 0
    let failed = 0

    try {
      const context = await browser.newContext()
      let page = await context.newPage()
      // A click that opens a new tab (target="_blank") leaves this
      // reference stale for the captcha check/bringToFront below —
      // executeSteps follows new tabs internally for its own steps, but
      // this keeps batch-runner's own reference in sync too.
      context.on('page', (newPage) => {
        page = newPage
      })

      for (let i = 0; i < values.length;) {
        if (cancelRequestedFlowIds.has(flowId)) break

        try {
          const row = await executeSteps(context, page, steps, flow.stepTimeoutMs, {
            stepId: inputStep.id,
            value: values[i]
          })
          rows.push(row)
          succeeded++
          i++
        } catch {
          if (await isCaptchaPresent(page)) {
            setCaptchaPending(flowId, true)
            onCaptcha(flowId)
            await page.bringToFront()
            await waitForCaptchaResume(flowId)
            if (cancelRequestedFlowIds.has(flowId)) break
            continue
          }
          failed++
          i++
        }

        onProgress({ flowId, processed: i, total: values.length, succeeded, failed })
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
    cancelRequestedFlowIds.delete(flowId)
    setCaptchaPending(flowId, false)
    setFlowRunning(flowId, false)
  }
}
