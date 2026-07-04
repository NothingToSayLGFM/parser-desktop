import { ipcMain, type BrowserWindow } from 'electron'
import { isRecording, setMode, startRecording, stopRecording } from '../recorder/recorder-engine'
import type { RecorderEvent, RecorderMode } from '../../shared/types'

export function registerRecorderIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('recorder:start', async (_event, url: string) => {
    await startRecording(url, (recorderEvent: RecorderEvent) => {
      mainWindow.webContents.send('recorder:step', recorderEvent)
    })
  })

  ipcMain.handle('recorder:stop', async () => {
    await stopRecording()
  })

  ipcMain.handle('recorder:is-recording', () => isRecording())

  ipcMain.handle('recorder:set-mode', async (_event, mode: RecorderMode) => {
    await setMode(mode)
  })
}
