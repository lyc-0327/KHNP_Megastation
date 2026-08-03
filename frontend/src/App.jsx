import { useState, useRef } from 'react'
import TopBar from './components/TopBar.jsx'
import LeftSidebar from './components/LeftSidebar.jsx'
import FlowCanvas from './components/FlowCanvas.jsx'
import FlowLibraryPanel from './components/FlowLibraryPanel.jsx'
import Palette from './components/Palette.jsx'
import MapView from './components/MapView.jsx'
import ProjectView from './components/ProjectView.jsx'

export default function App() {
  const [tab, setTab]                 = useState('flow')
  const [isDark, setIsDark]           = useState(true)
  const [flowLibOpen, setFlowLibOpen] = useState(false)
  const triggerExportRef = useRef(null)
  const flowActionsRef   = useRef(null)

  const handleExport = () => {
    triggerExportRef.current?.()
  }

  return (
    <div
      data-theme={isDark ? 'dark' : 'light'}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
    >
      <TopBar tab={tab} isDark={isDark} onToggleTheme={() => setIsDark(d => !d)} onExport={handleExport} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar tab={tab} setTab={setTab} flowLibOpen={flowLibOpen} setFlowLibOpen={setFlowLibOpen} />

        {flowLibOpen && tab === 'flow' && (
          <FlowLibraryPanel onClose={() => setFlowLibOpen(false)} flowActionsRef={flowActionsRef} />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {tab === 'flow' && (
            <>
              <FlowCanvas
                isDark={isDark}
                onRegisterExport={fn => { triggerExportRef.current = fn }}
                onRegisterActions={actions => { flowActionsRef.current = actions }}
              />
              <Palette />
            </>
          )}
          {tab === 'map' && (
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <MapView />
            </div>
          )}
          {tab === 'project' && <ProjectView />}
        </div>
      </div>
    </div>
  )
}
