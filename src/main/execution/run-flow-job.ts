import { app } from 'electron'
import { join } from 'path'
import { findFlowById } from '../db/flows-repository'
import { createRun, finishRun } from '../db/run-history-repository'
import { runFlow } from './execution-engine'
import { appendRowToXlsx } from './xlsx-writer'
import type { FieldMapping, Flow, FlowRunResult } from '../../shared/types'

function resolveOutputPath(flow: Flow): string {
  return flow.outputPath ?? join(app.getPath('userData'), 'output', `${flow.id}.xlsx`)
}

export async function runFlowJob(flowId: string): Promise<FlowRunResult> {
  const flow = findFlowById(flowId)
  if (!flow) {
    return { status: 'error', errorMessage: 'Флоу не найден' }
  }

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
  }
}
