import type { FlowRunningChange } from '../../shared/types'

const runningFlowIds = new Set<string>()
const listeners = new Set<(change: FlowRunningChange) => void>()

export function isFlowRunning(flowId: string): boolean {
  return runningFlowIds.has(flowId)
}

export function listRunningFlowIds(): string[] {
  return [...runningFlowIds]
}

export function setFlowRunning(flowId: string, isRunning: boolean): void {
  if (isRunning) {
    runningFlowIds.add(flowId)
  } else {
    runningFlowIds.delete(flowId)
  }

  for (const listener of listeners) {
    listener({ flowId, isRunning })
  }
}

export function onFlowRunningChange(listener: (change: FlowRunningChange) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
