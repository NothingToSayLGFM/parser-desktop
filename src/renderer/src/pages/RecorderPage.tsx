import { useEffect, useState } from 'react'
import type { FlowStep, FlowStepType, RecorderMode } from '../../../shared/types'
import './RecorderPage.css'

interface RecorderPageProps {
  flowId: string
  onSaved?: () => void
  onToast?: (message: string) => void
}

const STEP_TYPE_LABELS: Record<FlowStepType, string> = {
  goto: 'ПЕРЕХІД',
  click: 'КЛІК',
  fill: 'ЗАПОВНЕННЯ',
  extract: 'ОТРИМАННЯ'
}

export default function RecorderPage({
  flowId,
  onSaved,
  onToast
}: RecorderPageProps): React.JSX.Element {
  const [flowName, setFlowName] = useState<string | null>(null)
  const [url, setUrl] = useState('https://example.com')
  const [isRecording, setIsRecording] = useState(false)
  const [mode, setModeState] = useState<RecorderMode>('navigate')
  const [steps, setSteps] = useState<FlowStep[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
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
    try {
      await window.api.recorder.start(url)
      setIsRecording(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      onToast?.(`Не вдалося запустити браузер: ${message}`)
    }
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

  function handleToggleBatchInput(id: string): void {
    setSteps((previous) =>
      previous.map((step) => ({
        ...step,
        isBatchInput: step.id === id ? !step.isBatchInput : false
      }))
    )
  }

  function handleDeleteStep(id: string): void {
    setSteps((previous) => previous.filter((step) => step.id !== id))
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true)
    try {
      if (isRecording) {
        await window.api.recorder.stop()
        setIsRecording(false)
      }
      await window.api.flows.update(flowId, { stepsJson: JSON.stringify(steps) })
      onSaved?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Невідома помилка'
      onToast?.(`Не вдалося зберегти флоу: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="recorder-page">
      <header>
        <h1>{flowName ? `Рекордер — ${flowName}` : 'Рекордер'}</h1>
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
                {mode === 'extract' ? 'Режим витягування: УВІМК' : 'Режим витягування: вимк'}
              </button>
              <button onClick={handleStop}>Стоп</button>
            </>
          ) : (
            <button onClick={handleStart}>Почати запис</button>
          )}
          <button onClick={handleSave} disabled={isSaving || steps.length === 0}>
            Зберегти у флоу
          </button>
        </div>
      </header>

      {steps.length === 0 ? (
        <p>Кроки з&apos;являться тут у міру дій у відкритому браузері</p>
      ) : (
        <ol>
          {steps.map((step) => (
            <li key={step.id}>
              <span className="step-type">{STEP_TYPE_LABELS[step.type]}</span>
              {step.selector ? <code>{step.selector}</code> : null}
              {step.type === 'extract' ? (
                <>
                  <span className="step-value">{step.value}</span>
                  <input
                    type="text"
                    className="field-name-input"
                    placeholder="ім'я поля"
                    value={step.fieldName ?? ''}
                    onChange={(event) => handleFieldNameChange(step.id, event.target.value)}
                  />
                </>
              ) : step.type === 'fill' ? (
                <>
                  <span className="step-value">{step.value}</span>
                  <button
                    className={
                      step.isBatchInput ? 'batch-input-toggle active' : 'batch-input-toggle'
                    }
                    onClick={() => handleToggleBatchInput(step.id)}
                  >
                    {step.isBatchInput ? 'Параметр: УВІМК' : 'Параметр'}
                  </button>
                  {step.isBatchInput ? (
                    <input
                      type="text"
                      className="field-name-input"
                      placeholder="ім'я поля (напр. article)"
                      value={step.fieldName ?? ''}
                      onChange={(event) => handleFieldNameChange(step.id, event.target.value)}
                    />
                  ) : null}
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
