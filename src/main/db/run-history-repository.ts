import { randomUUID } from 'crypto'
import { getDb } from './index'
import type { RunHistoryEntry, RunStatus } from '../../shared/types'

interface RunHistoryRow {
  id: string
  flow_id: string
  started_at: string
  finished_at: string | null
  status: RunStatus
  rows_count: number | null
  error_message: string | null
  output_file_path: string | null
}

function toEntry(row: RunHistoryRow): RunHistoryEntry {
  return {
    id: row.id,
    flowId: row.flow_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    rowsCount: row.rows_count,
    errorMessage: row.error_message,
    outputFilePath: row.output_file_path
  }
}

export function createRun(flowId: string): RunHistoryEntry {
  const entry: RunHistoryEntry = {
    id: randomUUID(),
    flowId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
    rowsCount: null,
    errorMessage: null,
    outputFilePath: null
  }

  getDb()
    .prepare(
      `INSERT INTO run_history (id, flow_id, started_at, status)
       VALUES (@id, @flowId, @startedAt, @status)`
    )
    .run(entry)

  return entry
}

interface FinishRunUpdate {
  status: RunStatus
  rowsCount?: number | null
  errorMessage?: string | null
  outputFilePath?: string | null
}

export function finishRun(id: string, update: FinishRunUpdate): void {
  getDb()
    .prepare(
      `UPDATE run_history
       SET finished_at = @finishedAt, status = @status, rows_count = @rowsCount,
           error_message = @errorMessage, output_file_path = @outputFilePath
       WHERE id = @id`
    )
    .run({
      id,
      finishedAt: new Date().toISOString(),
      status: update.status,
      rowsCount: update.rowsCount ?? null,
      errorMessage: update.errorMessage ?? null,
      outputFilePath: update.outputFilePath ?? null
    })
}

export function findRunsByFlowId(flowId: string): RunHistoryEntry[] {
  const rows = getDb()
    .prepare('SELECT * FROM run_history WHERE flow_id = ? ORDER BY started_at DESC')
    .all(flowId) as RunHistoryRow[]
  return rows.map(toEntry)
}

export function interruptStaleRunningRuns(): void {
  getDb()
    .prepare(
      `UPDATE run_history
       SET finished_at = @finishedAt, status = 'error', error_message = @errorMessage
       WHERE status = 'running'`
    )
    .run({
      finishedAt: new Date().toISOString(),
      errorMessage: 'Перервано перезапуском застосунку'
    })
}
