import { Handle, Position } from '@xyflow/react'

// Left = target (input, green)  |  Right = source (output, blue)
const INPUT_HANDLE = {
  width: 11, height: 11,
  background: '#10B981',
  border: '2px solid #064e3b',
  top: 26,
}
const OUTPUT_HANDLE = {
  width: 11, height: 11,
  background: '#3B82F6',
  border: '2px solid #1e3a5f',
  top: 26,
}

// doeStatus: 'ok' → blue dot | 'error' → red dot | null → no dot
export default function BaseNode({ icon, label, selected, doeStatus }) {
  const dotColor =
    doeStatus === 'ok'    ? '#3B82F6' :
    doeStatus === 'error' ? '#EF4444' :
    null

  return (
    <div style={{ position: 'relative', paddingBottom: 14 }}>

      {/* DOE status indicator — top-left corner */}
      {dotColor && (
        <div style={{
          position: 'absolute',
          top: -5, left: 8,
          width: 9, height: 9,
          borderRadius: '50%',
          background: dotColor,
          border: '2px solid #0a0a0a',
          zIndex: 10,
          boxShadow: `0 0 6px ${dotColor}99`,
        }} />
      )}

      <Handle type="target" position={Position.Left}  style={INPUT_HANDLE}  />
      <Handle type="source" position={Position.Right} style={OUTPUT_HANDLE} />

      {/* Node body */}
      <div style={{
        width: 160, height: 52,
        background: '#252525',
        border: `1px solid ${selected ? '#4a9eff' : '#383838'}`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: selected
          ? '0 0 0 1px rgba(74,158,255,0.2), 0 4px 14px rgba(0,0,0,0.6)'
          : '0 2px 6px rgba(0,0,0,0.5)',
        cursor: 'default',
      }}>
        <div style={{
          width: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1e1e1e',
          borderRight: '1px solid #383838',
          borderRadius: '5px 0 0 5px',
          color: selected ? '#6ab4ff' : '#4a8ac4',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 11px', overflow: 'hidden' }}>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: selected ? '#e0e0e0' : '#b8b8b8',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: 0.1,
          }}>
            {label}
          </span>
        </div>
      </div>

      {/* Port direction labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 2px 0', pointerEvents: 'none' }}>
        <span style={{ fontSize: 7, color: '#10B981', fontWeight: 700, letterSpacing: 0.4, opacity: 0.9 }}>◀ IN</span>
        <span style={{ fontSize: 7, color: '#3B82F6', fontWeight: 700, letterSpacing: 0.4, opacity: 0.9 }}>OUT ▶</span>
      </div>
    </div>
  )
}
