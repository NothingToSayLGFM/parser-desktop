import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  CreateFlowInput,
  Flow,
  FlowRunResult,
  RecorderEvent,
  RecorderMode,
  UpdateFlowInput
} from '../shared/types'

// Custom APIs for renderer
const api = {
  flows: {
    list: (): Promise<Flow[]> => ipcRenderer.invoke('flows:list'),
    get: (id: string): Promise<Flow | null> => ipcRenderer.invoke('flows:get', id),
    create: (input: CreateFlowInput): Promise<Flow> => ipcRenderer.invoke('flows:create', input),
    update: (id: string, input: UpdateFlowInput): Promise<Flow | null> =>
      ipcRenderer.invoke('flows:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('flows:delete', id),
    run: (id: string): Promise<FlowRunResult> => ipcRenderer.invoke('flows:run', id)
  },
  recorder: {
    start: (url: string): Promise<void> => ipcRenderer.invoke('recorder:start', url),
    stop: (): Promise<void> => ipcRenderer.invoke('recorder:stop'),
    isRecording: (): Promise<boolean> => ipcRenderer.invoke('recorder:is-recording'),
    setMode: (mode: RecorderMode): Promise<void> => ipcRenderer.invoke('recorder:set-mode', mode),
    onStep: (callback: (event: RecorderEvent) => void): (() => void) => {
      const listener = (_event: unknown, recorderEvent: RecorderEvent): void =>
        callback(recorderEvent)
      ipcRenderer.on('recorder:step', listener)
      return () => ipcRenderer.removeListener('recorder:step', listener)
    }
  },
  dialog: {
    chooseOutputPath: (): Promise<string | null> => ipcRenderer.invoke('dialog:choose-output-path')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
