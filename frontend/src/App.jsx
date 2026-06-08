import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import LeftSidebar from './components/LeftSidebar.jsx'
import FlowCanvas from './components/FlowCanvas.jsx'
import Palette from './components/Palette.jsx'
import MapView from './components/MapView.jsx'
import ProjectView from './components/ProjectView.jsx'

export default function App() {
  const [mode, setMode] = useState('select')
  const [tab, setTab] = useState('flow')
  const [activeProject, setActiveProject] = useState(null)

  const handleLoadProject = (project) => {
    setActiveProject(project)
    setTab('map')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar mode={mode} tab={tab} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar tab={tab} setTab={setTab} mode={mode} setMode={setMode} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {tab === 'flow' && (
            <>
              <FlowCanvas mode={mode} />
              <Palette />
            </>
          )}
          {tab === 'map' && (
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <MapView
                key={activeProject?.id ?? 'default'}
                activeProject={activeProject}
              />
            </div>
          )}
          {tab === 'project' && (
            <ProjectView onLoadProject={handleLoadProject} />
          )}
        </div>
      </div>
    </div>
  )
}
