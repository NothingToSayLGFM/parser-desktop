import { app } from 'electron'
import { join } from 'path'
import type { Flow } from '../../shared/types'

export function resolveOutputPath(flow: Flow): string {
  return flow.outputPath ?? join(app.getPath('userData'), 'output', `${flow.id}.xlsx`)
}
