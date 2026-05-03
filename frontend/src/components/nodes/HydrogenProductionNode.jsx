import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7.5" y1="5" x2="7.5" y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="11"  y1="5" x2="11"  y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="14.5" y1="5" x2="14.5" y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  )
}

export default function HydrogenProductionNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'H₂ Production'} selected={selected} />
}
