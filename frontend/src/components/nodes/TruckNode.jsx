import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1.5" y="6.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 9.5H17L19.5 13V15.5H12.5V9.5Z"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx="5"    cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="15.5" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export default function TruckNode({ selected, data }) {
  return <BaseNode icon={<Icon />} label={data?.label ?? 'Truck Transport'} selected={selected} />
}
