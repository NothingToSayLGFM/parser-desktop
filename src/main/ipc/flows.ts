import { ipcMain } from 'electron'
import {
  createFlow,
  deleteFlow,
  findAllFlows,
  findFlowById,
  updateFlow
} from '../db/flows-repository'
import { syncFlowSchedule, unscheduleFlow } from '../scheduler/scheduler'
import type { CreateFlowInput, UpdateFlowInput } from '../../shared/types'

export function registerFlowsIpc(): void {
  ipcMain.handle('flows:list', () => findAllFlows())

  ipcMain.handle('flows:get', (_event, id: string) => findFlowById(id))

  ipcMain.handle('flows:create', (_event, input: CreateFlowInput) => {
    const flow = createFlow(input)
    syncFlowSchedule(flow)
    return flow
  })

  ipcMain.handle('flows:update', (_event, id: string, input: UpdateFlowInput) => {
    const flow = updateFlow(id, input)
    if (flow) {
      syncFlowSchedule(flow)
    }
    return flow
  })

  ipcMain.handle('flows:delete', (_event, id: string) => {
    unscheduleFlow(id)
    deleteFlow(id)
  })
}
