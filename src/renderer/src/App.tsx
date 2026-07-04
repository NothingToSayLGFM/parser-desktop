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
  // Kept mounted (just hidden) once opened, so a running batch and its
  // progress survive navigating to other tabs and back.
  const [batchFlowId, setBatchFlowId] = useState<string | null>(null)

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
    setBatchFlowId(flowId)
    setView('batch')
  }

  function handleSelectRecorderTab(): void {
    setSelectedFlowId(null)
    setView('recorder')
  }

  function handleFlowSaved(): void {
    setToastMessage('Флоу сохранён')
    setView('dashboard')
  }

  function handleMappingSaved(): void {
    setToastMessage('Маппинг сохранён')
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
        <button className={view === 'recorder' ? 'active' : ''} onClick={handleSelectRecorderTab}>
          Recorder
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
      {view === 'recorder' ? (
        <RecorderPage
          key={selectedFlowId ?? 'none'}
          flowId={selectedFlowId}
          onSaved={handleFlowSaved}
        />
      ) : null}
      {view === 'mapping' && selectedFlowId ? (
        <MappingPage key={selectedFlowId} flowId={selectedFlowId} onSaved={handleMappingSaved} />
      ) : null}
      {view === 'history' && selectedFlowId ? (
        <RunHistoryPage key={selectedFlowId} flowId={selectedFlowId} />
      ) : null}
      {batchFlowId ? (
        <div style={{ display: view === 'batch' ? 'contents' : 'none' }}>
          <BatchPage key={batchFlowId} flowId={batchFlowId} />
        </div>
      ) : null}
      {toastMessage ? (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  )
}

export default App
