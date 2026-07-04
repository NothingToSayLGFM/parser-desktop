import { useEffect, useState } from 'react'
import type { RunHistoryEntry, RunStatus } from '../../../shared/types'
import './RunHistoryPage.css'

interface RunHistoryPageProps {
  flowId: string
}

const STATUS_LABELS: Record<RunStatus, string> = {
  running: 'ВИКОНУЄТЬСЯ',
  success: 'УСПІШНО',
  error: 'ПОМИЛКА'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function RunHistoryPage({ flowId }: RunHistoryPageProps): React.JSX.Element {
  const [flowName, setFlowName] = useState('')
  const [runs, setRuns] = useState<RunHistoryEntry[]>([])

  useEffect(() => {
    window.api.flows.get(flowId).then((flow) => {
      if (flow) setFlowName(flow.name)
    })
    window.api.runHistory.listByFlow(flowId).then(setRuns)
  }, [flowId])

  return (
    <div className="run-history-page">
      <header>
        <h1>Історія запусків — {flowName}</h1>
      </header>

      {runs.length === 0 ? (
        <p>Флоу ще жодного разу не запускався</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Початок</th>
              <th>Завершення</th>
              <th>Статус</th>
              <th>Рядків</th>
              <th>Файл</th>
              <th>Помилка</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{formatDateTime(run.startedAt)}</td>
                <td>{formatDateTime(run.finishedAt)}</td>
                <td>
                  <span className={`status-badge ${run.status}`}>{STATUS_LABELS[run.status]}</span>
                </td>
                <td>{run.rowsCount ?? '—'}</td>
                <td className="output-path-cell">{run.outputFilePath ?? '—'}</td>
                <td className="error-cell">{run.errorMessage ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
