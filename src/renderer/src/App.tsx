import { useState } from 'react'
import FlowsDashboard from './pages/FlowsDashboard'
import RecorderPage from './pages/RecorderPage'
import MappingPage from './pages/MappingPage'
import RunHistoryPage from './pages/RunHistoryPage'
import BatchPage from './pages/BatchPage'
import Toast from './components/Toast'
import './App.css'

type View = 'dashboard' | 'recorder' | 'mapping' | 'history' | 'batch'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  // Every flow whose Batch tab was opened stays mounted (just hidden) for the
  // rest of the session, so a running batch and its progress survive
  // navigating away to other flows/tabs and back.
  const [openedBatchFlowIds, setOpenedBatchFlowIds] = useState<string[]>([])

  function handleOpenRecorder(flowId: string): void {
    setSelectedFlowId(flowId)
    setView('recorder')
  }

  function handleOpenMapping(flowId: string): void {
    setSelectedFlowId(flowId)
    setView('mapping')
  }

  function handleOpenHistory(flowId: string): void {
    setSelectedFlowId(flowId)
    setView('history')
  }

  function handleOpenBatch(flowId: string): void {
    setSelectedFlowId(flowId)
    setOpenedBatchFlowIds((previous) =>
      previous.includes(flowId) ? previous : [...previous, flowId]
    )
    setView('batch')
  }

  function handleFlowSaved(): void {
    setToastMessage('Флоу збережено')
    setView('dashboard')
  }

  function handleMappingSaved(): void {
    setToastMessage('Мапінг збережено')
    setView('dashboard')
  }

  return (
    <div className="app">
      <nav className="app-nav">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          Флоу
        </button>
      </nav>
      {view === 'dashboard' ? (
        <FlowsDashboard
          onOpenRecorder={handleOpenRecorder}
          onOpenMapping={handleOpenMapping}
          onOpenHistory={handleOpenHistory}
          onOpenBatch={handleOpenBatch}
          onToast={setToastMessage}
        />
      ) : null}
      {view === 'recorder' && selectedFlowId ? (
        <RecorderPage
          key={selectedFlowId}
          flowId={selectedFlowId}
          onSaved={handleFlowSaved}
          onToast={setToastMessage}
        />
      ) : null}
      {view === 'mapping' && selectedFlowId ? (
        <MappingPage
          key={selectedFlowId}
          flowId={selectedFlowId}
          onSaved={handleMappingSaved}
          onToast={setToastMessage}
        />
      ) : null}
      {view === 'history' && selectedFlowId ? (
        <RunHistoryPage key={selectedFlowId} flowId={selectedFlowId} />
      ) : null}
      {openedBatchFlowIds.map((flowId) => (
        <div
          key={flowId}
          style={{
            display: view === 'batch' && selectedFlowId === flowId ? 'contents' : 'none'
          }}
        >
          <BatchPage flowId={flowId} />
        </div>
      ))}
      {toastMessage ? (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  )
}

export default App
