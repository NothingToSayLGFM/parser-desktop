export type RunStatus = 'running' | 'success' | 'error'

export interface Flow {
  id: string
  name: string
  stepsJson: string
  mappingJson: string
  outputPath: string | null
  scheduleCron: string | null
  storageStatePath: string | null
  enabled: boolean
  stepTimeoutMs: number
  createdAt: string
  updatedAt: string
}

export interface CreateFlowInput {
  name: string
}

export interface UpdateFlowInput {
  name?: string
  stepsJson?: string
  mappingJson?: string
  outputPath?: string | null
  scheduleCron?: string | null
  enabled?: boolean
  stepTimeoutMs?: number
}

export interface RunHistoryEntry {
  id: string
  flowId: string
  startedAt: string
  finishedAt: string | null
  status: RunStatus
  rowsCount: number | null
  errorMessage: string | null
  outputFilePath: string | null
}

export type FlowStepType = 'goto' | 'click' | 'fill' | 'extract'

export interface FlowStep {
  id: string
  type: FlowStepType
  selector?: string
  value?: string
  fieldName?: string
  isBatchInput?: boolean
}

export type RecorderEventType = FlowStepType

export interface RecorderEvent {
  type: RecorderEventType
  selector?: string
  value?: string
}

export type RecorderMode = 'navigate' | 'extract'

export interface FlowRunResult {
  status: 'success' | 'error'
  row?: Record<string, string>
  errorMessage?: string
  outputFilePath?: string | null
}

export interface FieldMapping {
  fieldName: string
  columnHeader: string
  order: number
}

export interface BatchProgress {
  processed: number
  total: number
  succeeded: number
  failed: number
}

export interface BatchRunResult {
  succeeded: number
  failed: number
  outputFilePath: string | null
}

export interface FlowRunningChange {
  flowId: string
  isRunning: boolean
}
