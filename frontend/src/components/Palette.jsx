import { useState } from 'react'
import { paletteItems } from './nodes/index.jsx'

function PaletteCard({ item }) {
  const [hovered, setHovered] = useState(false)

  const onDragStart = (e) => {
    e.dataTransfer.setData('application/reactflow', item.type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px 6px',
        width: 88,
        borderRadius: 8,
        background: hovered ? '#0F172A' : 'transparent',
        border: `1px solid ${hovered ? item.color : '#1E293B'}`,
        cursor: 'grab',
        transition: 'all 0.15s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 6px 16px rgba(0,0,0,0.4), 0 0 0 1px ${item.color}44` : 'none',
        userSelect: 'none',
      }}
    >
      {/* Color accent line */}
      <div style={{
        width: '100%', height: 2, borderRadius: 1,
        background: hovered ? item.color : '#334155',
        transition: 'background 0.15s',
        marginBottom: 4,
      }} />

      <div style={{
        width: 58, height: 46,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.icon}
      </div>

      <span style={{
        fontSize: 10, fontWeight: 500,
        color: hovered ? '#E2E8F0' : '#64748B',
        whiteSpace: 'nowrap', letterSpacing: 0.3,
        transition: 'color 0.15s',
        textAlign: 'center',
      }}>
        {item.label}
      </span>
    </div>
  )
}

export default function Palette() {
  return (
    <div style={{
      height: 118,
      background: '#1E293B',
      borderTop: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 6,
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        marginRight: 14, flexShrink: 0,
        borderRight: '1px solid #334155', paddingRight: 14,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          장치
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          팔레트
        </span>
      </div>

      {paletteItems.map((item) => (
        <PaletteCard key={item.type} item={item} />
      ))}
    </div>
  )
}
