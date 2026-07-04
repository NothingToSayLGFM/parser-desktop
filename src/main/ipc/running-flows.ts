import { ipcMain, type BrowserWindow } from 'electron'
import { listRunningFlowIds, onFlowRunningChange } from '../state/running-flows'

export function registerRunningFlowsIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('flows:list-running', () => listRunningFlowIds())

  onFlowRunningChange((change) => {
    mainWindow.webContents.send('flows:running-changed', change)
  })
}
