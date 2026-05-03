import { useState, useEffect } from 'react'

const TYPE_META = {
  hydrogenProduction: { label: 'H₂ Production',   color: '#3B82F6' },
  storageTank:        { label: 'Storage Tank',     color: '#10B981' },
  compressor:         { label: 'Compressor',       color: '#F59E0B' },
  pipeline:           { label: 'Pipeline',         color: '#64748B' },
  truck:              { label: 'Truck Transport',  color: '#8B5CF6' },
  demandNode:         { label: 'Demand Node',      color: '#EF4444' },
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export default function PropertiesPanel({ node, onClose, onDelete, onLabelChange }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    setLabel(node?.data?.label ?? '')
  }, [node?.id])

  if (!node) return null

  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#3B82F6' }
  const x = node.position?.x
  const y = node.position?.y

  return (
    <div style={{
      width: 240,
      background: '#0F172A',
      borderLeft: '1px solid #1E293B',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: '#0A0F1A',
        borderBottom: '1px solid #1E293B',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Properties
        </span>
        <button
          onClick={onClose}
          style={{
            width: 22, height: 22, background: 'none', border: 'none',
            borderRadius: 4, cursor: 'pointer', color: '#475569',
            fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#94A3B8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
        >×</button>
      </div>

      {/* Type badge */}
      <div style={{ padding: '12px 14px 0' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 9px',
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}44`,
          borderRadius: 20,
          fontSize: 10, fontWeight: 600, color: meta.color, letterSpacing: 0.3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
          {meta.label}
        </span>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

        <Field label="Label">
          <input
            value={label}
            onChange={(e) => { setLabel(e.target.value); onLabelChange(node.id, e.target.value) }}
            onFocus={(e) => (e.target.style.borderColor = meta.color)}
            onBlur={(e) => (e.target.style.borderColor = '#1E293B')}
            style={{
              width: '100%', padding: '6px 10px',
              background: '#1E293B',
              border: '1px solid #1E293B', borderRadius: 5,
              fontSize: 12, color: '#E2E8F0',
              outline: 'none', fontFamily: 'system-ui',
              transition: 'border-color 0.15s',
            }}
          />
        </Field>

        <Field label="Position">
          <div style={{ display: 'flex', gap: 8 }}>
            {[['X', x], ['Y', y]].map(([axis, val]) => (
              <div key={axis} style={{
                flex: 1, background: '#1E293B',
                border: '1px solid #334155', borderRadius: 5, padding: '5px 10px',
              }}>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>{axis}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace', marginTop: 1 }}>
                  {typeof val === 'number' ? val.toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>
        </Field>

        <Field label="Node ID">
          <div style={{
            fontSize: 10, color: '#475569', fontFamily: 'monospace',
            background: '#1E293B', border: '1px solid #334155',
            borderRadius: 5, padding: '6px 10px', wordBreak: 'break-all',
          }}>
            {node.id}
          </div>
        </Field>
      </div>

      {/* Delete */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #1E293B' }}>
        <button
          onClick={() => onDelete(node.id)}
          style={{
            width: '100%', padding: '7px',
            background: 'transparent', border: '1px solid #3B1515',
            borderRadius: 5, color: '#F87171',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            letterSpacing: 0.3,
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3B1515'; e.currentTarget.style.borderColor = '#F87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#3B1515' }}
        >
          Remove Node
        </button>
      </div>
    </div>
  )
}
