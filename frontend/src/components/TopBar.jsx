export default function TopBar({ mode }) {
  return (
    <div style={{
      height: 44,
      background: '#0F172A',
      borderBottom: '1px solid #1E293B',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      flexShrink: 0,
      userSelect: 'none',
      gap: 12,
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="#38BDF8" opacity="0.9"/>
        <text x="8" y="11" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="system-ui">H₂</text>
      </svg>

      <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}>
        Hydrogen Megastation
      </span>

      <div style={{ width: 1, height: 18, background: '#334155', margin: '0 4px' }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        background: mode === 'connect' ? '#1E3A5F' : '#1E293B',
        border: `1px solid ${mode === 'connect' ? '#3B82F6' : '#334155'}`,
        borderRadius: 4,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: mode === 'connect' ? '#3B82F6' : '#475569',
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: mode === 'connect' ? '#93C5FD' : '#64748B',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          {mode === 'connect' ? 'Connect Mode' : 'Select Mode'}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: 11, color: '#334155' }}>Del — 노드 삭제</span>
    </div>
  )
}
