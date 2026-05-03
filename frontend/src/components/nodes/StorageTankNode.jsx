import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <ellipse cx="11" cy="5" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4"  y1="5"  x2="4"  y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="18" y1="5"  x2="18" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="11" cy="17" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5.5" y1="13.5" x2="16.5" y2="13.5"
        stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" strokeDasharray="2,2" />
    </svg>
  )
}

export default function StorageTankNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'Storage Tank'} selected={selected} />
}
