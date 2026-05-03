import { useState, useEffect } from 'react'
import { COMMON_SPECS, DEVICE_SPECS, DEFAULT_SPECS } from './nodes/specs.js'

const TYPE_META = {
  hydrogenProduction: { label: 'H₂ Production',  color: '#3B82F6' },
  storageTank:        { label: 'Storage Tank',    color: '#10B981' },
  compressor:         { label: 'Compressor',      color: '#F59E0B' },
  pipeline:           { label: 'Pipeline',        color: '#64748B' },
  truck:              { label: 'Truck Transport', color: '#8B5CF6' },
  demandNode:         { label: 'Demand Node',     color: '#EF4444' },
}

function SpecInput({ field, value, onChange, color }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: '#475569', fontWeight: 700,
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
      }}>
        {field.label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder="—"
          onFocus={(e) => (e.target.style.borderColor = color)}
          onBlur={(e)  => (e.target.style.borderColor = '#334155')}
          style={{
            width: '100%',
            padding: '6px 44px 6px 10px',
            background: '#1E293B',
            border: '1px solid #334155', borderRadius: 5,
            fontSize: 12, color: '#E2E8F0', outline: 'none',
            fontFamily: 'system-ui', transition: 'border-color 0.15s',
          }}
        />
        <span style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 9, color: '#475569', pointerEvents: 'none',
          maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {field.unit}
        </span>
      </div>
    </div>
  )
}

function SectionDivider({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      <span style={{
        fontSize: 9, fontWeight: 700, color: '#475569',
        letterSpacing: 1.2, textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: '#1E293B' }} />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: '#475569', fontWeight: 700,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export default function NodeModal({ node, onClose, onApply }) {
  const [label, setLabel] = useState(node.data?.label ?? '')
  const [specs, setSpecs] = useState(() => ({
    ...(DEFAULT_SPECS[node.type] ?? {}),
    ...(node.data?.specs ?? {}),
  }))

  useEffect(() => {
    setLabel(node.data?.label ?? '')
    setSpecs({
      ...(DEFAULT_SPECS[node.type] ?? {}),
      ...(node.data?.specs ?? {}),
    })
  }, [node.id])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#3B82F6' }
  const deviceFields = DEVICE_SPECS[node.type] ?? []

  const setSpec = (key, value) => setSpecs((prev) => ({ ...prev, [key]: value }))

  const handleApply = () => {
    onApply(node.id, { label, specs })
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 460,
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: 10,
          boxShadow: '0 24px 56px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 80px)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '13px 18px',
          background: '#0A0F1A',
          borderBottom: '1px solid #1E293B',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px',
              background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
              borderRadius: 20, fontSize: 10, fontWeight: 600, color: meta.color,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: '#334155' }}>/ Setup</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, background: 'none', border: 'none',
              borderRadius: 6, cursor: 'pointer', color: '#475569',
              fontSize: 20, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94A3B8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >×</button>
        </div>

        {/* Body */}
        <div style={{
          padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 14,
          overflowY: 'auto',
          flex: 1,
        }}>

          {/* Label */}
          <Field label="Label">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
              onFocus={(e) => (e.target.style.borderColor = meta.color)}
              onBlur={(e)  => (e.target.style.borderColor = '#334155')}
              style={{
                width: '100%', padding: '8px 12px',
                background: '#1E293B',
                border: '1px solid #334155', borderRadius: 6,
                fontSize: 13, color: '#E2E8F0', outline: 'none',
                fontFamily: 'system-ui', transition: 'border-color 0.15s',
              }}
            />
          </Field>

          {/* Operating Specs */}
          <SectionDivider title="Operating Specs" />

          {/* Common specs (3-col) */}
          <div>
            <div style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Common
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {COMMON_SPECS.map((f) => (
                <SpecInput key={f.key} field={f} value={specs[f.key]} onChange={setSpec} color={meta.color} />
              ))}
            </div>
          </div>

          {/* Device-specific specs (2-col) */}
          {deviceFields.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {meta.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {deviceFields.map((f) => (
                  <SpecInput key={f.key} field={f} value={specs[f.key]} onChange={setSpec} color={meta.color} />
                ))}
              </div>
            </div>
          )}

          {/* Node Info */}
          <SectionDivider title="Node Info" />

          <Field label="Position">
            <div style={{ display: 'flex', gap: 10 }}>
              {[['X', node.position?.x], ['Y', node.position?.y]].map(([axis, val]) => (
                <div key={axis} style={{
                  flex: 1, background: '#1E293B',
                  border: '1px solid #334155', borderRadius: 6, padding: '6px 12px',
                }}>
                  <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>{axis}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>
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
              borderRadius: 6, padding: '6px 12px', wordBreak: 'break-all',
            }}>
              {node.id}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #1E293B',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          flexShrink: 0,
          background: '#0A0F1A',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px', background: 'transparent',
              border: '1px solid #334155', borderRadius: 6,
              fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 500,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94A3B8' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748B' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '7px 18px', background: meta.color, border: 'none',
              borderRadius: 6, fontSize: 12, color: 'white',
              cursor: 'pointer', fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
