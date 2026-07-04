import cron, { type ScheduledTask } from 'node-cron'
import { Notification } from 'electron'
import { findAllFlows } from '../db/flows-repository'
import { runFlowJob } from '../execution/run-flow-job'
import type { Flow } from '../../shared/types'

const scheduledTasks = new Map<string, ScheduledTask>()

async function runScheduledFlow(flow: Flow): Promise<void> {
  const result = await runFlowJob(flow.id)
  if (result.status === 'error') {
    new Notification({
      title: `Помилка автозапуску: ${flow.name}`,
      body: result.errorMessage ?? 'Невідома помилка'
    }).show()
  }
}

export function syncFlowSchedule(flow: Flow): void {
  scheduledTasks.get(flow.id)?.stop()
  scheduledTasks.delete(flow.id)

  if (!flow.enabled || !flow.scheduleCron || !cron.validate(flow.scheduleCron)) {
    return
  }

  const task = cron.schedule(flow.scheduleCron, () => {
    runScheduledFlow(flow)
  })
  scheduledTasks.set(flow.id, task)
}

export function unscheduleFlow(flowId: string): void {
  scheduledTasks.get(flowId)?.stop()
  scheduledTasks.delete(flowId)
}

export function initScheduler(): void {
  for (const flow of findAllFlows()) {
    syncFlowSchedule(flow)
  }
}
