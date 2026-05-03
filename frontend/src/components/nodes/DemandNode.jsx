import BaseNode from '../BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L20 11L11 20L2 11Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="5.5" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 8.5L14.5 11L12 13.5"
        stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

export default function DemandNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'Demand Node'} selected={selected} />
}
