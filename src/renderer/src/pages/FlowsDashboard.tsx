import { useEffect, useState } from 'react'
import type { Flow } from '../../../shared/types'
import './FlowsDashboard.css'

interface FlowsDashboardProps {
  onOpenRecorder: (flowId: string) => void
  onOpenMapping: (flowId: string) => void
  onToast: (message: string) => void
}

export default function FlowsDashboard({
  onOpenRecorder,
  onOpenMapping,
  onToast
}: FlowsDashboardProps): React.JSX.Element {
  const [flows, setFlows] = useState<Flow[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [runningFlowIds, setRunningFlowIds] = useState<Set<string>>(new Set())

  async function loadFlows(): Promise<void> {
    const result = await window.api.flows.list()
    setFlows(result)
  }

  useEffect(() => {
    window.api.flows.list().then(setFlows)
  }, [])

  async function handleCreate(): Promise<void> {
    setIsCreating(true)
    try {
      const name = `Новый флоу ${flows.length + 1}`
      await window.api.flows.create({ name })
      await loadFlows()
    } finally {
      setIsCreating(false)
    }
  }

  async function handleToggleEnabled(flow: Flow): Promise<void> {
    await window.api.flows.update(flow.id, { enabled: !flow.enabled })
    await loadFlows()
  }

  async function handleScheduleChange(id: string, scheduleCron: string): Promise<void> {
    const trimmed = scheduleCron.trim()
    await window.api.flows.update(id, { scheduleCron: trimmed || null })
    await loadFlows()
  }

  async function handleDelete(id: string): Promise<void> {
    if (runningFlowIds.has(id)) {
      onToast('Флоу сейчас выполняется — дождитесь завершения')
      return
    }
    await window.api.flows.delete(id)
    await loadFlows()
  }

  async function handleRun(id: string): Promise<void> {
    setRunningFlowIds((previous) => new Set(previous).add(id))
    try {
      const result = await window.api.flows.run(id)
      if (result.status === 'success') {
        const fieldsCount = Object.keys(result.row ?? {}).length
        const fileSuffix = result.outputFilePath ? ` → ${result.outputFilePath}` : ''
        onToast(`Запуск успешен: извлечено полей — ${fieldsCount}${fileSuffix}`)
      } else {
        onToast(`Ошибка запуска: ${result.errorMessage}`)
      }
    } finally {
      setRunningFlowIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="flows-dashboard">
      <header>
        <h1>Флоу парсинга</h1>
        <button onClick={handleCreate} disabled={isCreating}>
          + Создать флоу
        </button>
      </header>

      {flows.length === 0 ? (
        <p>Пока нет ни одного флоу</p>
      ) : (
        <ul>
          {flows.map((flow) => (
            <li key={flow.id} className="flow-card">
              <div className="flow-card-header">
                <span className="flow-name">{flow.name}</span>
                <button
                  className={flow.enabled ? 'enabled-toggle on' : 'enabled-toggle off'}
                  onClick={() => handleToggleEnabled(flow)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  {flow.enabled ? 'включён' : 'выключен'}
                </button>
              </div>

              <div className="flow-card-schedule">
                <span>Расписание:</span>
                <input
                  type="text"
                  className="schedule-input"
                  defaultValue={flow.scheduleCron ?? ''}
                  onBlur={(event) => handleScheduleChange(flow.id, event.target.value)}
                  placeholder="cron, напр. 0 * * * *"
                  disabled={runningFlowIds.has(flow.id)}
                />
              </div>

              <div className="flow-card-actions">
                <button
                  onClick={() => onOpenRecorder(flow.id)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  Recorder
                </button>
                <button
                  onClick={() => onOpenMapping(flow.id)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  Маппинг
                </button>
                <button onClick={() => handleRun(flow.id)} disabled={runningFlowIds.has(flow.id)}>
                  {runningFlowIds.has(flow.id) ? 'Выполняется…' : 'Запустить'}
                </button>
                <button
                  onClick={() => handleDelete(flow.id)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
