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

export default function ContextMenu({ node, x, y, onSetup, onDelete, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#3B82F6' }

  const W = 160, H = 104
  const left = x + W > window.innerWidth  ? x - W : x
  const top  = y + H > window.innerHeight ? y - H : y

  return (
    <div
      ref={ref}
      style={{
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
      }}
    >
      {/* Node type header */}
      <div style={{
        padding: '7px 14px',
        background: '#0F172A',
        borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 600, color: meta.color,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
        {meta.label}
      </div>

      {/* Setup */}
      <button
        style={{ ...itemBase, color: '#CBD5E1' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => { onSetup(); onClose() }}
      >
        <SetupIcon /> Setup
      </button>

      <div style={{ height: 1, background: '#334155', margin: '0 10px' }} />

      {/* Delete */}
      <button
        style={{ ...itemBase, color: '#F87171' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3B1515')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => { onDelete(); onClose() }}
      >
        <TrashIcon /> Delete
      </button>
    </div>
  )
}
