import { dialog, ipcMain, shell, type BrowserWindow } from 'electron'

export function registerDialogIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('dialog:choose-output-path', async (): Promise<string | null> => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'output.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    return result.canceled ? null : (result.filePath ?? null)
  })

  ipcMain.handle('dialog:choose-input-path', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('dialog:show-item-in-folder', (_event, filePath: string): void => {
    shell.showItemInFolder(filePath)
  })
}
