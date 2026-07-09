import { ipcMain, type BrowserWindow } from 'electron'
import { readXlsxHeaders } from '../execution/xlsx-reader'
import { requestBatchCancel, resumeAfterCaptcha, runBatch } from '../execution/batch-runner'
import { listCaptchaPendingFlowIds, onCaptchaPendingChange } from '../state/captcha-flows'
import type { BatchProgress, BatchRunResult } from '../../shared/types'

export function registerBatchIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('xlsx:read-headers', (_event, filePath: string) => readXlsxHeaders(filePath))

  ipcMain.handle('flows:list-captcha-pending', () => listCaptchaPendingFlowIds())

  onCaptchaPendingChange((change) => {
    mainWindow.webContents.send('flows:captcha-pending-changed', change)
  })

  ipcMain.handle(
    'batch:run',
    (
      _event,
      flowId: string,
      inputFilePath: string,
      inputColumnHeader: string
    ): Promise<BatchRunResult> =>
      runBatch(
        flowId,
        inputFilePath,
        inputColumnHeader,
        (progress: BatchProgress) => {
          mainWindow.webContents.send('batch:progress', progress)
        },
        (capturedFlowId: string) => {
          mainWindow.webContents.send('batch:captcha', { flowId: capturedFlowId })
          mainWindow.flashFrame(true)
        }
      )
  )

  ipcMain.handle('batch:cancel', (_event, flowId: string) => {
    requestBatchCancel(flowId)
  })

  ipcMain.handle('batch:resume-after-captcha', (_event, flowId: string) => {
    resumeAfterCaptcha(flowId)
    mainWindow.flashFrame(false)
  })
}
