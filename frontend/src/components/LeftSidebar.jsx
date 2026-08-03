const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M2 4l5-2 4 2 5-2v12l-5 2-4-2-5 2V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    <path d="M7 2v12M11 4v12" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)
const FlowsheetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="12" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)
const ProjectIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="3" width="16" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 7h16" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 2v3M13 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M4 11h4M4 13.5h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const SavesIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <rect x="1.5" y="1.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 1.5v5c0 .28.22.5.5.5h7a.5.5 0 0 0 .5-.5V1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="10.5" y="2" width="1.5" height="3.5" rx="0.4" fill="currentColor"/>
    <path d="M4 11h10M4 13.5h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

function SidebarButton({ icon, label, active, onClick, accent = '#3B82F6', accentBg = '#1E3A5F', accentText = '#93C5FD' }) {
  return (
    <button onClick={onClick} title={label} style={{
      width: 44, height: 44,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, background: active ? accentBg : 'transparent',
      border: `1px solid ${active ? accent : 'transparent'}`,
      borderRadius: 6, cursor: 'pointer',
      color: active ? accentText : 'var(--text-dim)',
      transition: 'all 0.15s ease', padding: 0,
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover-bg)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      <span style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</span>
    </button>
  )
}

export default function LeftSidebar({ tab, setTab, flowLibOpen, setFlowLibOpen }) {
  return (
    <div style={{
      width: 56, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-mid)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 0', gap: 4, flexShrink: 0,
    }}>
      <SidebarButton icon={<MapIcon />} label="Map" active={tab === 'map'} onClick={() => setTab('map')}
        accent="#4fc3f7" accentBg="#0e2a3a" accentText="#4fc3f7" />
      <SidebarButton icon={<FlowsheetIcon />} label="Flow" active={tab === 'flow'} onClick={() => setTab('flow')}
        accent="#3B82F6" accentBg="#1E3A5F" accentText="#93C5FD" />
      <SidebarButton icon={<ProjectIcon />} label="Project" active={tab === 'project'} onClick={() => setTab('project')}
        accent="#a371f7" accentBg="#1f1735" accentText="#d2a8ff" />
      <div style={{ flex: 1 }} />
      <SidebarButton icon={<SavesIcon />} label="Saves" active={flowLibOpen} onClick={() => setFlowLibOpen?.(v => !v)}
        accent="#34D399" accentBg="#052e16" accentText="#34D399" />
    </div>
  )
}
