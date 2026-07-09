import type { FlowCaptchaChange } from '../../shared/types'

const captchaPendingFlowIds = new Set<string>()
const listeners = new Set<(change: FlowCaptchaChange) => void>()

export function listCaptchaPendingFlowIds(): string[] {
  return [...captchaPendingFlowIds]
}

export function setCaptchaPending(flowId: string, isPending: boolean): void {
  const changed = isPending ? !captchaPendingFlowIds.has(flowId) : captchaPendingFlowIds.has(flowId)
  if (!changed) return

  if (isPending) {
    captchaPendingFlowIds.add(flowId)
  } else {
    captchaPendingFlowIds.delete(flowId)
  }

  for (const listener of listeners) {
    listener({ flowId, isPending })
  }
}

export function onCaptchaPendingChange(listener: (change: FlowCaptchaChange) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
