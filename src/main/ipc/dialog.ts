import { dialog, ipcMain, type BrowserWindow } from 'electron'

export function registerDialogIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('dialog:choose-output-path', async (): Promise<string | null> => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'output.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    return result.canceled ? null : (result.filePath ?? null)
  })
}
