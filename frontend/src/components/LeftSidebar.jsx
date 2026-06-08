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

const SelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <path d="M4 2L4 13L7 10L9 15L10.8 14.2L8.8 9.5L13 9.5L4 2Z" fill="currentColor" />
  </svg>
)

const ConnectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="12" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <polyline points="9.5,6.5 12,9 9.5,11.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
  </svg>
)

function SidebarButton({ icon, label, active, onClick, accent = '#3B82F6', accentBg = '#1E3A5F', accentText = '#93C5FD' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 44, height: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3,
        background: active ? accentBg : 'transparent',
        border: `1px solid ${active ? accent : 'transparent'}`,
        borderRadius: 6, cursor: 'pointer',
        color: active ? accentText : '#475569',
        transition: 'all 0.15s ease', padding: 0,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1E293B' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      <span style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label}
      </span>
    </button>
  )
}

export default function LeftSidebar({ tab, setTab, mode, setMode }) {
  return (
    <div style={{
      width: 56, background: '#0F172A', borderRight: '1px solid #1E293B',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 0', gap: 4, flexShrink: 0,
    }}>
      <SidebarButton
        icon={<MapIcon />} label="Map"
        active={tab === 'map'} onClick={() => setTab('map')}
        accent="#4fc3f7" accentBg="#0e2a3a" accentText="#4fc3f7"
      />
      <SidebarButton
        icon={<FlowsheetIcon />} label="Flow"
        active={tab === 'flow'} onClick={() => setTab('flow')}
        accent="#3B82F6" accentBg="#1E3A5F" accentText="#93C5FD"
      />
      <SidebarButton
        icon={<ProjectIcon />} label="Project"
        active={tab === 'project'} onClick={() => setTab('project')}
        accent="#a371f7" accentBg="#1f1735" accentText="#d2a8ff"
      />

      {tab === 'flow' && (
        <>
          <div style={{ width: 32, height: 1, background: '#1E293B', margin: '4px 0' }} />
          <SidebarButton icon={<SelectIcon />} label="Select" active={mode === 'select'} onClick={() => setMode('select')} />
          <SidebarButton icon={<ConnectIcon />} label="Connect" active={mode === 'connect'} onClick={() => setMode('connect')} />
        </>
      )}
    </div>
  )
}
