import { randomUUID } from 'crypto'
import { getDb } from './index'
import type { CreateFlowInput, Flow, UpdateFlowInput } from '../../shared/types'

interface FlowRow {
  id: string
  name: string
  steps_json: string
  mapping_json: string
  output_path: string | null
  schedule_cron: string | null
  storage_state_path: string | null
  enabled: number
  created_at: string
  updated_at: string
}

function toFlow(row: FlowRow): Flow {
  return {
    id: row.id,
    name: row.name,
    stepsJson: row.steps_json,
    mappingJson: row.mapping_json,
    outputPath: row.output_path,
    scheduleCron: row.schedule_cron,
    storageStatePath: row.storage_state_path,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function findAllFlows(): Flow[] {
  const rows = getDb().prepare('SELECT * FROM flows ORDER BY updated_at DESC').all() as FlowRow[]
  return rows.map(toFlow)
}

export function findFlowById(id: string): Flow | null {
  const row = getDb().prepare('SELECT * FROM flows WHERE id = ?').get(id) as FlowRow | undefined
  return row ? toFlow(row) : null
}

export function createFlow(input: CreateFlowInput): Flow {
  const now = new Date().toISOString()
  const flow: Flow = {
    id: randomUUID(),
    name: input.name,
    stepsJson: '[]',
    mappingJson: '[]',
    outputPath: null,
    scheduleCron: null,
    storageStatePath: null,
    enabled: true,
    createdAt: now,
    updatedAt: now
  }

  getDb()
    .prepare(
      `INSERT INTO flows (id, name, steps_json, mapping_json, output_path, schedule_cron, storage_state_path, enabled, created_at, updated_at)
       VALUES (@id, @name, @stepsJson, @mappingJson, @outputPath, @scheduleCron, @storageStatePath, @enabled, @createdAt, @updatedAt)`
    )
    .run({ ...flow, enabled: flow.enabled ? 1 : 0 })

  return flow
}

export function updateFlow(id: string, input: UpdateFlowInput): Flow | null {
  const existing = findFlowById(id)
  if (!existing) {
    return null
  }

  const updated: Flow = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString()
  }

  getDb()
    .prepare(
      `UPDATE flows SET name = @name, steps_json = @stepsJson, mapping_json = @mappingJson,
         output_path = @outputPath, schedule_cron = @scheduleCron, enabled = @enabled, updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({ ...updated, enabled: updated.enabled ? 1 : 0 })

  return updated
}

export function deleteFlow(id: string): void {
  getDb().prepare('DELETE FROM flows WHERE id = ?').run(id)
}
