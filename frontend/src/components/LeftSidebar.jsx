const SelectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 2L4 13L7 10L9 15L10.8 14.2L8.8 9.5L13 9.5L4 2Z" fill="currentColor" />
  </svg>
)

const ConnectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="12" y="6" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <polyline points="9.5,6.5 12,9 9.5,11.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
  </svg>
)

function SidebarButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        background: active ? '#1E3A5F' : 'transparent',
        border: `1px solid ${active ? '#3B82F6' : 'transparent'}`,
        borderRadius: 6,
        cursor: 'pointer',
        color: active ? '#93C5FD' : '#475569',
        transition: 'all 0.15s ease',
        padding: 0,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1E293B' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label}
      </span>
    </button>
  )
}

export default function LeftSidebar({ mode, setMode }) {
  return (
    <div style={{
      width: 52,
      background: '#0F172A',
      borderRight: '1px solid #1E293B',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 0',
      gap: 4,
      flexShrink: 0,
    }}>
      <SidebarButton
        icon={<SelectIcon />}
        label="Select"
        active={mode === 'select'}
        onClick={() => setMode('select')}
      />
      <SidebarButton
        icon={<ConnectIcon />}
        label="Connect"
        active={mode === 'connect'}
        onClick={() => setMode('connect')}
      />
    </div>
  )
}
