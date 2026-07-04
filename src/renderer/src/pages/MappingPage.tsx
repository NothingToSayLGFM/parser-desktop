import { useEffect, useState } from 'react'
import type { FieldMapping, FlowStep } from '../../../shared/types'
import { getFieldKey } from '../../../shared/field-key'
import './MappingPage.css'

interface MappingPageProps {
  flowId: string
  onSaved?: () => void
  onToast?: (message: string) => void
}

function reconcileMapping(existing: FieldMapping[], fieldKeys: string[]): FieldMapping[] {
  const kept = existing.filter((entry) => fieldKeys.includes(entry.fieldName))
  const knownFieldNames = new Set(kept.map((entry) => entry.fieldName))
  const added = fieldKeys
    .filter((fieldKey) => !knownFieldNames.has(fieldKey))
    .map((fieldKey, index) => ({
      fieldName: fieldKey,
      columnHeader: fieldKey,
      order: kept.length + index
    }))
  return [...kept, ...added]
}

export default function MappingPage({
  flowId,
  onSaved,
  onToast
}: MappingPageProps): React.JSX.Element {
  const [flowName, setFlowName] = useState('')
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [outputPath, setOutputPath] = useState<string | null>(null)
  const [stepTimeoutMs, setStepTimeoutMs] = useState(8000)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    window.api.flows.get(flowId).then((flow) => {
      if (!flow) return
      setFlowName(flow.name)
      setOutputPath(flow.outputPath)
      setStepTimeoutMs(flow.stepTimeoutMs)

      const steps = JSON.parse(flow.stepsJson) as FlowStep[]
      const mappableSteps = steps.filter(
        (step) => step.type === 'extract' || (step.type === 'fill' && step.isBatchInput)
      )
      const fieldKeys = [...new Set(mappableSteps.map(getFieldKey))].filter((key) => key.length > 0)
      const existingMapping = JSON.parse(flow.mappingJson) as FieldMapping[]
      setMapping(reconcileMapping(existingMapping, fieldKeys))
    })
  }, [flowId])

  function handleColumnHeaderChange(fieldName: string, columnHeader: string): void {
    setMapping((previous) =>
      previous.map((entry) => (entry.fieldName === fieldName ? { ...entry, columnHeader } : entry))
    )
  }

  function handleMove(index: number, direction: -1 | 1): void {
    setMapping((previous) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= previous.length) return previous
      const next = [...previous]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next.map((entry, i) => ({ ...entry, order: i }))
    })
  }

  async function handleChooseOutputPath(): Promise<void> {
    const chosenPath = await window.api.dialog.chooseOutputPath()
    if (chosenPath) {
      setOutputPath(chosenPath)
    }
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true)
    try {
      const orderedMapping = mapping.map((entry, index) => ({ ...entry, order: index }))
      await window.api.flows.update(flowId, {
        mappingJson: JSON.stringify(orderedMapping),
        outputPath,
        stepTimeoutMs
      })
      onSaved?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Невідома помилка'
      onToast?.(`Не вдалося зберегти мапінг: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mapping-page">
      <header>
        <h1>Мапінг — {flowName}</h1>
        <button onClick={handleSave} disabled={isSaving}>
          Зберегти
        </button>
      </header>

      <div className="output-path-row">
        <span>Файл виводу:</span>
        <code>{outputPath ?? 'не обрано — буде використано шлях за замовчуванням'}</code>
        <button onClick={handleChooseOutputPath}>Обрати файл…</button>
      </div>

      <div className="output-path-row">
        <span>Таймаут очікування елемента (мс):</span>
        <input
          type="number"
          className="timeout-input"
          min={1000}
          step={1000}
          value={stepTimeoutMs}
          onChange={(event) => setStepTimeoutMs(Number(event.target.value))}
        />
      </div>

      {mapping.length === 0 ? (
        <p>
          У кроках флоу немає позначених полів для отримання даних — спочатку запишіть їх у
          Рекордері
        </p>
      ) : (
        <ol>
          {mapping.map((entry, index) => (
            <li key={entry.fieldName}>
              <span className="field-name">{entry.fieldName}</span>
              <input
                type="text"
                value={entry.columnHeader}
                onChange={(event) => handleColumnHeaderChange(entry.fieldName, event.target.value)}
              />
              <button onClick={() => handleMove(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button onClick={() => handleMove(index, 1)} disabled={index === mapping.length - 1}>
                ↓
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
