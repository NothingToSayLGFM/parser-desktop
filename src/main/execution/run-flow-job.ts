import { findFlowById } from '../db/flows-repository'
import { createRun, finishRun } from '../db/run-history-repository'
import { isFlowRunning, setFlowRunning } from '../state/running-flows'
import { runFlow } from './execution-engine'
import { resolveOutputPath } from './output-path'
import { appendRowToXlsx } from './xlsx-writer'
import type { FieldMapping, FlowRunResult } from '../../shared/types'

export async function runFlowJob(flowId: string): Promise<FlowRunResult> {
  const flow = findFlowById(flowId)
  if (!flow) {
    return { status: 'error', errorMessage: 'Флоу не знайдено' }
  }

  if (isFlowRunning(flowId)) {
    return { status: 'error', errorMessage: 'Флоу вже виконується' }
  }

  setFlowRunning(flowId, true)
  const run = createRun(flowId)

  try {
    const row = await runFlow(flow)
    const rowsCount = Object.keys(row).length > 0 ? 1 : 0

    let outputFilePath: string | null = null
    if (rowsCount > 0) {
      const mapping = JSON.parse(flow.mappingJson) as FieldMapping[]
      if (mapping.length > 0) {
        outputFilePath = resolveOutputPath(flow)
        await appendRowToXlsx(outputFilePath, mapping, row)
      }
    }

    finishRun(run.id, { status: 'success', rowsCount, outputFilePath })
    return { status: 'success', row, outputFilePath }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    finishRun(run.id, { status: 'error', errorMessage: message })
    return { status: 'error', errorMessage: message }
  } finally {
    setFlowRunning(flowId, false)
  }
}
