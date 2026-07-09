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
    setProgress({ flowId, processed: 0, total: 0, succeeded: 0, failed: 0 })

    const unsubscribe = window.api.batch.onProgress((batchProgress) => {
      if (batchProgress.flowId === flowId) setProgress(batchProgress)
    })
    try {
      const runResult = await window.api.batch.run(flowId, inputFilePath, selectedColumn)
      setResult(runResult)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Невідома помилка')
    } finally {
      unsubscribe()
      setIsRunning(false)
    }
  }

  async function handleCancel(): Promise<void> {
    await window.api.batch.cancel(flowId)
  }

  return (
    <div className="batch-page">
      <header>
        <h1>Пакетна обробка — {flowName}</h1>
      </header>

      <div className="batch-input-row">
        <span>Вхідний файл:</span>
        <code>{inputFilePath ?? 'не обрано'}</code>
        <button onClick={handleChooseFile} disabled={isRunning}>
          Обрати файл…
        </button>
      </div>

      {headers.length > 0 ? (
        <div className="batch-input-row">
          <span>Колонка зі значеннями:</span>
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
          <button onClick={handleCancel}>Скасувати</button>
        ) : (
          <button onClick={handleRun} disabled={!inputFilePath || !selectedColumn}>
            Запустити обробку
          </button>
        )}
      </div>

      {error ? <p className="batch-error">Помилка: {error}</p> : null}

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
            Оброблено {progress.processed} з {progress.total} (успішно: {progress.succeeded},
            помилок: {progress.failed})
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="batch-result">
          <p>
            Готово: успішно — {result.succeeded}, пропущено з помилками — {result.failed}
          </p>
          {result.outputFilePath ? (
            <div className="batch-input-row">
              <code>{result.outputFilePath}</code>
              <button onClick={() => window.api.dialog.showItemInFolder(result.outputFilePath!)}>
                Показати файл
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
