import { Handle, Position } from '@xyflow/react'

const H = { width: 8, height: 8, background: '#4a9eff', border: '2px solid #252525' }

export default function BaseNode({ icon, label, selected }) {
  return (
    <div style={{
      width: 160,
      height: 52,
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
      <Handle type="target" position={Position.Left} style={H} />
      <Handle type="source" position={Position.Right} style={H} />

      {/* Icon area */}
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

      {/* Label area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        padding: '0 11px', overflow: 'hidden',
      }}>
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
  )
}
