import { ipcMain } from 'electron'
import { runFlowJob } from '../execution/run-flow-job'
import type { FlowRunResult } from '../../shared/types'

export function registerRunsIpc(): void {
  ipcMain.handle('flows:run', (_event, flowId: string): Promise<FlowRunResult> =>
    runFlowJob(flowId)
  )
}
