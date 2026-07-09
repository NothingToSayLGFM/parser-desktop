import { useEffect, useState } from 'react'
import type { Flow } from '../../../shared/types'
import './FlowsDashboard.css'

interface FlowsDashboardProps {
  onOpenRecorder: (flowId: string) => void
  onOpenMapping: (flowId: string) => void
  onOpenHistory: (flowId: string) => void
  onOpenBatch: (flowId: string) => void
  onToast: (message: string) => void
}

export default function FlowsDashboard({
  onOpenRecorder,
  onOpenMapping,
  onOpenHistory,
  onOpenBatch,
  onToast
}: FlowsDashboardProps): React.JSX.Element {
  const [flows, setFlows] = useState<Flow[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [runningFlowIds, setRunningFlowIds] = useState<Set<string>>(new Set())
  const [captchaPendingFlowIds, setCaptchaPendingFlowIds] = useState<Set<string>>(new Set())

  async function loadFlows(): Promise<void> {
    const result = await window.api.flows.list()
    setFlows(result)
  }

  useEffect(() => {
    window.api.flows.list().then(setFlows)
    window.api.flows.listRunning().then((ids) => setRunningFlowIds(new Set(ids)))
    window.api.flows.listCaptchaPending().then((ids) => setCaptchaPendingFlowIds(new Set(ids)))
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.flows.onRunningChanged(({ flowId, isRunning }) => {
      setRunningFlowIds((previous) => {
        const next = new Set(previous)
        if (isRunning) {
          next.add(flowId)
        } else {
          next.delete(flowId)
        }
        return next
      })
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.flows.onCaptchaPendingChanged(({ flowId, isPending }) => {
      setCaptchaPendingFlowIds((previous) => {
        const next = new Set(previous)
        if (isPending) {
          next.add(flowId)
        } else {
          next.delete(flowId)
        }
        return next
      })
    })
    return unsubscribe
  }, [])

  async function handleCreate(): Promise<void> {
    setIsCreating(true)
    try {
      const name = `Новий флоу ${flows.length + 1}`
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

  async function handleNameChange(id: string, name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) {
      await loadFlows()
      return
    }
    await window.api.flows.update(id, { name: trimmed })
    await loadFlows()
  }

  async function handleDelete(id: string): Promise<void> {
    if (runningFlowIds.has(id)) {
      onToast('Флоу зараз виконується — зачекайте на завершення')
      return
    }
    await window.api.flows.delete(id)
    await loadFlows()
  }

  async function handleRun(id: string): Promise<void> {
    const result = await window.api.flows.run(id)
    if (result.status === 'success') {
      const fieldsCount = Object.keys(result.row ?? {}).length
      const fileSuffix = result.outputFilePath ? ` → ${result.outputFilePath}` : ''
      onToast(`Запуск успішний: отримано полів — ${fieldsCount}${fileSuffix}`)
    } else {
      onToast(`Помилка запуску: ${result.errorMessage}`)
    }
  }

  return (
    <div className="flows-dashboard">
      <header>
        <h1>Флоу парсингу</h1>
        <button onClick={handleCreate} disabled={isCreating}>
          + Створити флоу
        </button>
      </header>

      {flows.length === 0 ? (
        <p>Поки що немає жодного флоу</p>
      ) : (
        <ul>
          {flows.map((flow) => (
            <li key={flow.id} className="flow-card">
              <div className="flow-card-header">
                <input
                  type="text"
                  className="flow-name-input"
                  defaultValue={flow.name}
                  onBlur={(event) => handleNameChange(flow.id, event.target.value)}
                  disabled={runningFlowIds.has(flow.id)}
                />
                <button
                  className={flow.enabled ? 'enabled-toggle on' : 'enabled-toggle off'}
                  onClick={() => handleToggleEnabled(flow)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  {flow.enabled ? 'увімкнено' : 'вимкнено'}
                </button>
              </div>

              {captchaPendingFlowIds.has(flow.id) ? (
                <div className="flow-card-captcha">
                  <span>Виявлено капчу — потрібне втручання</span>
                  <button onClick={() => onOpenBatch(flow.id)}>Перейти до Пакетно</button>
                </div>
              ) : null}

              <div className="flow-card-schedule">
                <span>Розклад:</span>
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
                  Рекордер
                </button>
                <button
                  onClick={() => onOpenMapping(flow.id)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  Мапінг
                </button>
                <button onClick={() => handleRun(flow.id)} disabled={runningFlowIds.has(flow.id)}>
                  {runningFlowIds.has(flow.id) ? 'Виконується…' : 'Запустити'}
                </button>
                <button onClick={() => onOpenHistory(flow.id)}>Історія</button>
                <button onClick={() => onOpenBatch(flow.id)}>Пакетно</button>
                <button
                  onClick={() => handleDelete(flow.id)}
                  disabled={runningFlowIds.has(flow.id)}
                >
                  Видалити
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
