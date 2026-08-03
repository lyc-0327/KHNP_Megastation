import { useEffect, useRef } from 'react'

const TYPE_META = {
  hydrogenProduction: { label: 'H₂ Production',  color: '#3B82F6' },
  storageTank:        { label: 'Storage Tank',    color: '#10B981' },
  compressor:         { label: 'Compressor',      color: '#F59E0B' },
  pipeline:           { label: 'Pipeline',        color: '#64748B' },
  truck:              { label: 'Truck Transport', color: '#8B5CF6' },
  demandNode:         { label: 'Demand Node',     color: '#EF4444' },
}

function SetupIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.1 1.1M10 10l1.1 1.1M2.9 11.1L4 10M10 4l1.1-1.1"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 7a5 5 0 1 0 1.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="2,3.5 2,7 5.5,7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M5 3h4M2 4.5h10M4.5 4.5l.7 6h3.6l.7-6"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const itemBase = {
  width: '100%', padding: '8px 14px',
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 12, display: 'flex', alignItems: 'center', gap: 9,
  textAlign: 'left', transition: 'background 0.1s',
}

export default function ContextMenu({ node, x, y, onSetup, onResetPosition, onDelete, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#3B82F6' }
  const hasOriginalPos = !!node.data?.originalPosition

  const W = 168
  const estimatedH = 40 + 36 + 1 + 36 + (hasOriginalPos ? 36 + 1 : 0) + 1 + 36
  const left = x + W > window.innerWidth  ? x - W : x
  const top  = y + estimatedH > window.innerHeight ? y - estimatedH : y

  return (
    <div ref={ref} style={{
      position: 'fixed', top, left,
      zIndex: 9999,
      background: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 7,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      width: W,
      userSelect: 'none',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Node type header */}
      <div style={{
        padding: '7px 14px',
        background: '#0F172A',
        borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 600, color: meta.color,
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:meta.color, display:'inline-block', flexShrink:0 }} />
        {meta.label}
      </div>

      {/* Setup */}
      <button style={{ ...itemBase, color: '#CBD5E1' }}
        onMouseEnter={e => (e.currentTarget.style.background='#334155')}
        onMouseLeave={e => (e.currentTarget.style.background='transparent')}
        onClick={() => { onSetup(); onClose() }}>
        <SetupIcon /> Setup
      </button>

      {/* 원래 위치로 — only shown when original position was recorded */}
      {hasOriginalPos && (
        <>
          <div style={{ height:1, background:'#334155', margin:'0 10px' }} />
          <button style={{ ...itemBase, color: '#94A3B8' }}
            onMouseEnter={e => (e.currentTarget.style.background='#334155')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}
            onClick={() => { onResetPosition(node.id); onClose() }}>
            <ResetIcon /> 원래 위치로
          </button>
        </>
      )}

      <div style={{ height:1, background:'#334155', margin:'0 10px' }} />

      {/* Delete */}
      <button style={{ ...itemBase, color: '#F87171' }}
        onMouseEnter={e => (e.currentTarget.style.background='#3B1515')}
        onMouseLeave={e => (e.currentTarget.style.background='transparent')}
        onClick={() => { onDelete(); onClose() }}>
        <TrashIcon /> Delete
      </button>
    </div>
  )
}
