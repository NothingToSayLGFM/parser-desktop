import { useEffect, useState } from 'react'
import type { FlowStep, RecorderMode } from '../../../shared/types'
import './RecorderPage.css'

interface RecorderPageProps {
  flowId: string | null
  onSaved?: () => void
}

export default function RecorderPage({ flowId, onSaved }: RecorderPageProps): React.JSX.Element {
  const [flowName, setFlowName] = useState<string | null>(null)
  const [url, setUrl] = useState('https://example.com')
  const [isRecording, setIsRecording] = useState(false)
  const [mode, setModeState] = useState<RecorderMode>('navigate')
  const [steps, setSteps] = useState<FlowStep[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!flowId) return
    window.api.flows.get(flowId).then((flow) => {
      if (!flow) return
      setFlowName(flow.name)
      setSteps(JSON.parse(flow.stepsJson) as FlowStep[])
    })
  }, [flowId])

  useEffect(() => {
    const unsubscribe = window.api.recorder.onStep((event) => {
      setSteps((previous) => [...previous, { ...event, id: crypto.randomUUID() }])
    })
    return unsubscribe
  }, [])

  async function handleStart(): Promise<void> {
    setSteps([])
    setModeState('navigate')
    await window.api.recorder.start(url)
    setIsRecording(true)
  }

  async function handleStop(): Promise<void> {
    await window.api.recorder.stop()
    setIsRecording(false)
  }

  async function handleToggleMode(): Promise<void> {
    const nextMode: RecorderMode = mode === 'navigate' ? 'extract' : 'navigate'
    await window.api.recorder.setMode(nextMode)
    setModeState(nextMode)
  }

  function handleFieldNameChange(id: string, fieldName: string): void {
    setSteps((previous) => previous.map((step) => (step.id === id ? { ...step, fieldName } : step)))
  }

  function handleDeleteStep(id: string): void {
    setSteps((previous) => previous.filter((step) => step.id !== id))
  }

  async function handleSave(): Promise<void> {
    if (!flowId) return
    setIsSaving(true)
    try {
      if (isRecording) {
        await window.api.recorder.stop()
        setIsRecording(false)
      }
      await window.api.flows.update(flowId, { stepsJson: JSON.stringify(steps) })
      onSaved?.()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="recorder-page">
      <header>
        <h1>{flowName ? `Recorder — ${flowName}` : 'Recorder'}</h1>
        <div className="recorder-controls">
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isRecording}
            placeholder="https://supplier.com"
          />
          {isRecording ? (
            <>
              <button
                className={mode === 'extract' ? 'mode-toggle active' : 'mode-toggle'}
                onClick={handleToggleMode}
              >
                {mode === 'extract' ? 'Режим извлечения: ВКЛ' : 'Режим извлечения: выкл'}
              </button>
              <button onClick={handleStop}>Стоп</button>
            </>
          ) : (
            <button onClick={handleStart}>Начать запись</button>
          )}
          {flowId ? (
            <button onClick={handleSave} disabled={isSaving || steps.length === 0}>
              Сохранить в флоу
            </button>
          ) : null}
        </div>
      </header>

      {!flowId ? <p className="recorder-hint">Флоу не выбран — шаги не будут сохранены</p> : null}

      {steps.length === 0 ? (
        <p>Шаги появятся здесь по мере действий в открытом браузере</p>
      ) : (
        <ol>
          {steps.map((step) => (
            <li key={step.id}>
              <span className="step-type">{step.type}</span>
              {step.selector ? <code>{step.selector}</code> : null}
              {step.type === 'extract' ? (
                <>
                  <span className="step-value">{step.value}</span>
                  <input
                    type="text"
                    className="field-name-input"
                    placeholder="имя поля"
                    value={step.fieldName ?? ''}
                    onChange={(event) => handleFieldNameChange(step.id, event.target.value)}
                  />
                </>
              ) : step.value ? (
                <span className="step-value">{step.value}</span>
              ) : null}
              <button className="delete-step" onClick={() => handleDeleteStep(step.id)}>
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
