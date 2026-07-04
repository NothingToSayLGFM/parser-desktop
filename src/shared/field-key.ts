import type { FlowStep } from './types'

export function getExtractFieldKey(step: FlowStep): string {
  return step.fieldName?.trim() || step.selector || ''
}
