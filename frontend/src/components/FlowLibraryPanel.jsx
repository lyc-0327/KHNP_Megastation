import { useState } from 'react'

const STORAGE_KEY = 'khnp_flow_sessions'

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export default function FlowLibraryPanel({ onClose, flowActionsRef }) {
  const [sessions, setSessions] = useState(loadSessions)
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [search,   setSearch]   = useState('')
  const [flashId,  setFlashId]  = useState(null)

  const handleSave = () => {
    if (!saveName.trim()) return
    const actions = flowActionsRef?.current
    if (!actions) return
    const { nodes, edges } = actions.getFlow()
    const session = {
      id: Date.now().toString(),
      name: saveName.trim(),
      description: saveDesc.trim(),
      savedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      nodes,
      edges,
    }
    const updated = [session, ...sessions]
    setSessions(updated)
    saveSessions(updated)
    setFlashId(session.id)
    setSaveName('')
    setSaveDesc('')
    setTimeout(() => setFlashId(null), 1800)
  }

  const handleLoad = session => {
    const actions = flowActionsRef?.current
    if (!actions) return
    actions.loadFlow(session.nodes, session.edges)
  }

  const handleDelete = id => {
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    saveSessions(updated)
  }

  const filtered = search
    ? sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : sessions

  return (
    <div style={{
      width: 220, background: '#090E1A', borderRight: '1px solid #1E293B',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 9px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" style={{ color: '#34D399', flexShrink: 0 }}>
          <rect x="1.5" y="1.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 1.5v5c0 .28.22.5.5.5h7a.5.5 0 0 0 .5-.5V1.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="10.5" y="2" width="1.5" height="3.5" rx="0.4" fill="currentColor"/>
          <path d="M4 11h10M4 13.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', flex: 1, letterSpacing: 0.3 }}>Flow 저장소</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#334155', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#64748B'}
          onMouseLeave={e => e.currentTarget.style.color = '#334155'}>×</button>
      </div>

      {/* Save section */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>현재 상태 저장</div>
        <input
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="저장 이름..."
          style={{ width: '100%', boxSizing: 'border-box', background: '#0D1525', border: '1px solid #1E293B', borderRadius: 5, padding: '6px 8px', color: '#CBD5E1', fontSize: 12, outline: 'none', marginBottom: 5 }}
          onFocus={e => e.currentTarget.style.borderColor = '#334155'}
          onBlur={e => e.currentTarget.style.borderColor = '#1E293B'}
        />
        <input
          value={saveDesc}
          onChange={e => setSaveDesc(e.target.value)}
          placeholder="설명 (선택)..."
          style={{ width: '100%', boxSizing: 'border-box', background: '#0D1525', border: '1px solid #1E293B', borderRadius: 5, padding: '5px 8px', color: '#94A3B8', fontSize: 11, outline: 'none', marginBottom: 8 }}
          onFocus={e => e.currentTarget.style.borderColor = '#334155'}
          onBlur={e => e.currentTarget.style.borderColor = '#1E293B'}
        />
        <button
          onClick={handleSave}
          disabled={!saveName.trim()}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: saveName.trim() ? 'pointer' : 'default',
            background: saveName.trim() ? '#064e3b' : '#0a0f1a',
            border: `1px solid ${saveName.trim() ? '#065f46' : '#1E293B'}`,
            color: saveName.trim() ? '#34D399' : '#1f2937',
            transition: 'all 0.15s',
          }}
        >
          {flashId ? '✓ 저장됨' : '저장'}
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="검색..."
          style={{ width: '100%', boxSizing: 'border-box', background: '#0D1525', border: '1px solid #1E293B', borderRadius: 5, padding: '5px 8px', color: '#CBD5E1', fontSize: 11, outline: 'none' }}
          onFocus={e => e.currentTarget.style.borderColor = '#334155'}
          onBlur={e => e.currentTarget.style.borderColor = '#1E293B'}
        />
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <p style={{ color: '#1f2937', fontSize: 11, textAlign: 'center', padding: '24px 12px', lineHeight: 1.6 }}>
            {sessions.length === 0 ? '저장된 항목이 없습니다.\n현재 공정을 저장해보세요.' : '검색 결과 없음'}
          </p>
        )}
        {filtered.map(s => (
          <div key={s.id} style={{ padding: '9px 12px', borderBottom: '1px solid #0D1525', background: flashId === s.id ? '#052e16' : 'transparent', transition: 'background 0.3s' }}>
            <div style={{ fontSize: 12, color: '#C9D1D9', fontWeight: 600, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
            {s.description && (
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>
            )}
            <div style={{ fontSize: 10, color: '#1E3A5F', marginBottom: 7 }}>
              {new Date(s.savedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' · '}{s.nodeCount ?? s.nodes?.length ?? 0}개 노드
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => handleLoad(s)}
                style={{ flex: 1, padding: '5px 0', background: '#0f2c4a', border: '1px solid #1E3A5F', borderRadius: 4, color: '#60A5FA', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1E3A5F'; e.currentTarget.style.borderColor = '#2563EB' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0f2c4a'; e.currentTarget.style.borderColor = '#1E3A5F' }}
              >불러오기</button>
              <button
                onClick={() => handleDelete(s.id)}
                style={{ width: 28, background: 'none', border: '1px solid #1E293B', borderRadius: 4, color: '#334155', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7f1d1d'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#334155' }}
                title="삭제"
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
