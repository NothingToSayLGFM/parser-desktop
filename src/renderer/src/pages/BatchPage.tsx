import { useEffect, useState } from 'react'
import type { BatchProgress, BatchRunResult } from '../../../shared/types'
import './BatchPage.css'

interface BatchPageProps {
  flowId: string
}

export default function BatchPage({ flowId }: BatchPageProps): React.JSX.Element {
  const [flowName, setFlowName] = useState('')
  const [inputFilePath, setInputFilePath] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [result, setResult] = useState<BatchRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.flows.get(flowId).then((flow) => {
      if (flow) setFlowName(flow.name)
    })
  }, [flowId])

  async function handleChooseFile(): Promise<void> {
    const chosenPath = await window.api.dialog.chooseInputPath()
    if (!chosenPath) return

    setInputFilePath(chosenPath)
    setResult(null)
    const fileHeaders = await window.api.batch.readHeaders(chosenPath)
    setHeaders(fileHeaders)
    setSelectedColumn(fileHeaders[0] ?? '')
  }

  async function handleRun(): Promise<void> {
    if (!inputFilePath || !selectedColumn) return

    setIsRunning(true)
    setResult(null)
    setError(null)
    setProgress({ processed: 0, total: 0, succeeded: 0, failed: 0 })

    const unsubscribe = window.api.batch.onProgress(setProgress)
    try {
      const runResult = await window.api.batch.run(flowId, inputFilePath, selectedColumn)
      setResult(runResult)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error')
    } finally {
      unsubscribe()
      setIsRunning(false)
    }
  }

  async function handleCancel(): Promise<void> {
    await window.api.batch.cancel()
  }

  return (
    <div className="batch-page">
      <header>
        <h1>Batch — {flowName}</h1>
      </header>

      <div className="batch-input-row">
        <span>Входной файл:</span>
        <code>{inputFilePath ?? 'не выбран'}</code>
        <button onClick={handleChooseFile} disabled={isRunning}>
          Выбрать файл…
        </button>
      </div>

      {headers.length > 0 ? (
        <div className="batch-input-row">
          <span>Колонка со значениями:</span>
          <select
            value={selectedColumn}
            onChange={(event) => setSelectedColumn(event.target.value)}
            disabled={isRunning}
          >
            {headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="batch-controls">
        {isRunning ? (
          <button onClick={handleCancel}>Отменить</button>
        ) : (
          <button onClick={handleRun} disabled={!inputFilePath || !selectedColumn}>
            Запустить batch
          </button>
        )}
      </div>

      {error ? <p className="batch-error">Ошибка: {error}</p> : null}

      {progress ? (
        <div className="batch-progress">
          <div className="batch-progress-bar">
            <div
              className="batch-progress-fill"
              style={{
                width: progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : '0%'
              }}
            />
          </div>
          <p>
            Обработано {progress.processed} из {progress.total} (успешно: {progress.succeeded},
            ошибок: {progress.failed})
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="batch-result">
          <p>
            Готово: успешно — {result.succeeded}, пропущено с ошибками — {result.failed}
          </p>
          {result.outputFilePath ? <code>{result.outputFilePath}</code> : null}
        </div>
      ) : null}
    </div>
  )
}
