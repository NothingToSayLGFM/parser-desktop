import { useState } from 'react'
import FlowsDashboard from './pages/FlowsDashboard'
import RecorderPage from './pages/RecorderPage'
import MappingPage from './pages/MappingPage'
import Toast from './components/Toast'
import './App.css'

type View = 'dashboard' | 'recorder' | 'mapping'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function handleOpenRecorder(flowId: string): void {
    setSelectedFlowId(flowId)
    setView('recorder')
  }

  function handleOpenMapping(flowId: string): void {
    setSelectedFlowId(flowId)
    setView('mapping')
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
      {toastMessage ? (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  )
}

export default App
