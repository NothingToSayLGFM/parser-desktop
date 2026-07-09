import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  BatchCaptchaEvent,
  BatchProgress,
  BatchRunResult,
  CreateFlowInput,
  Flow,
  FlowCaptchaChange,
  FlowRunningChange,
  FlowRunResult,
  RecorderEvent,
  RecorderMode,
  RunHistoryEntry,
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
    run: (id: string): Promise<FlowRunResult> => ipcRenderer.invoke('flows:run', id),
    listRunning: (): Promise<string[]> => ipcRenderer.invoke('flows:list-running'),
    onRunningChanged: (callback: (change: FlowRunningChange) => void): (() => void) => {
      const listener = (_event: unknown, change: FlowRunningChange): void => callback(change)
      ipcRenderer.on('flows:running-changed', listener)
      return () => ipcRenderer.removeListener('flows:running-changed', listener)
    },
    listCaptchaPending: (): Promise<string[]> => ipcRenderer.invoke('flows:list-captcha-pending'),
    onCaptchaPendingChanged: (callback: (change: FlowCaptchaChange) => void): (() => void) => {
      const listener = (_event: unknown, change: FlowCaptchaChange): void => callback(change)
      ipcRenderer.on('flows:captcha-pending-changed', listener)
      return () => ipcRenderer.removeListener('flows:captcha-pending-changed', listener)
    }
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
    chooseOutputPath: (): Promise<string | null> => ipcRenderer.invoke('dialog:choose-output-path'),
    chooseInputPath: (): Promise<string | null> => ipcRenderer.invoke('dialog:choose-input-path'),
    showItemInFolder: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('dialog:show-item-in-folder', filePath)
  },
  runHistory: {
    listByFlow: (flowId: string): Promise<RunHistoryEntry[]> =>
      ipcRenderer.invoke('run-history:list-by-flow', flowId)
  },
  batch: {
    readHeaders: (filePath: string): Promise<string[]> =>
      ipcRenderer.invoke('xlsx:read-headers', filePath),
    run: (
      flowId: string,
      inputFilePath: string,
      inputColumnHeader: string
    ): Promise<BatchRunResult> =>
      ipcRenderer.invoke('batch:run', flowId, inputFilePath, inputColumnHeader),
    cancel: (flowId: string): Promise<void> => ipcRenderer.invoke('batch:cancel', flowId),
    resumeAfterCaptcha: (flowId: string): Promise<void> =>
      ipcRenderer.invoke('batch:resume-after-captcha', flowId),
    onProgress: (callback: (progress: BatchProgress) => void): (() => void) => {
      const listener = (_event: unknown, progress: BatchProgress): void => callback(progress)
      ipcRenderer.on('batch:progress', listener)
      return () => ipcRenderer.removeListener('batch:progress', listener)
    },
    onCaptcha: (callback: (event: BatchCaptchaEvent) => void): (() => void) => {
      const listener = (_event: unknown, captchaEvent: BatchCaptchaEvent): void =>
        callback(captchaEvent)
      ipcRenderer.on('batch:captcha', listener)
      return () => ipcRenderer.removeListener('batch:captcha', listener)
    }
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
