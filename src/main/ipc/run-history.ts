import { ipcMain } from 'electron'
import { findRunsByFlowId } from '../db/run-history-repository'

export function registerRunHistoryIpc(): void {
  ipcMain.handle('run-history:list-by-flow', (_event, flowId: string) => findRunsByFlowId(flowId))
}
