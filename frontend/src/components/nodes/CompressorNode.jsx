import BaseNode from '../BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 7L7.5 15L16.5 11Z"
        stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

export default function CompressorNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'Compressor'} selected={selected} />
}
