function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function TopBar({ tab, isDark, onToggleTheme, onExport }) {
  return (
    <div style={{
      height: 44, background: 'var(--bg-topbar)', borderBottom: '1px solid var(--border-mid)',
      display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, userSelect: 'none', gap: 12,
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="#38BDF8" opacity="0.9"/>
        <text x="8" y="11" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="system-ui">H₂</text>
      </svg>
      <span style={{ color: 'var(--text-bright)', fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}>
        Hydrogen Megastation
      </span>

      <div style={{ flex: 1 }} />

      {/* FLOW 탭일 때 내보내기 버튼 */}
      {tab === 'flow' && (
        <button onClick={onExport} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', background: '#1f6feb', border: '1px solid #1f6feb',
          borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          내보내기
        </button>
      )}

      <button onClick={onToggleTheme} title={isDark ? '라이트 모드' : '다크 모드'} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, background: 'transparent', border: '1px solid var(--border-dim)',
        borderRadius: 6, color: 'var(--text-mid)', cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-bright)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-mid)' }}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}
