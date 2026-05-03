import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import LeftSidebar from './components/LeftSidebar.jsx'
import FlowCanvas from './components/FlowCanvas.jsx'
import Palette from './components/Palette.jsx'

export default function App() {
  const [mode, setMode] = useState('select')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar mode={mode} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar mode={mode} setMode={setMode} />
        <FlowCanvas mode={mode} />
      </div>
      <Palette />
    </div>
  )
}
