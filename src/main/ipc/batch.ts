import { ipcMain, type BrowserWindow } from 'electron'
import { readXlsxHeaders } from '../execution/xlsx-reader'
import { requestBatchCancel, runBatch } from '../execution/batch-runner'
import type { BatchProgress, BatchRunResult } from '../../shared/types'

export function registerBatchIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('xlsx:read-headers', (_event, filePath: string) => readXlsxHeaders(filePath))

  ipcMain.handle(
    'batch:run',
    (
      _event,
      flowId: string,
      inputFilePath: string,
      inputColumnHeader: string
    ): Promise<BatchRunResult> =>
      runBatch(flowId, inputFilePath, inputColumnHeader, (progress: BatchProgress) => {
        mainWindow.webContents.send('batch:progress', progress)
      })
  )

  ipcMain.handle('batch:cancel', (_event, flowId: string) => {
    requestBatchCancel(flowId)
  })
}
