import type { FlowStep } from './types'

export function getFieldKey(step: FlowStep): string {
  return step.fieldName?.trim() || step.selector || ''
}
