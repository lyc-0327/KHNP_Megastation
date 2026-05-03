import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="1" y1="8"  x2="21" y2="8"  stroke="currentColor" strokeWidth="1.5" />
      <line x1="1" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 5.5L19.5 11L14 16.5"
        stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

export default function PipelineNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'Pipeline'} selected={selected} />
}
