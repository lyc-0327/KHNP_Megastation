import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* vertical pressure vessel */}
      <ellipse cx="11" cy="5.5" rx="5.5" ry="1.8" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="5.5" y1="5.5" x2="5.5" y2="16.5" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="16.5" y1="5.5" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx="11" cy="16.5" rx="5.5" ry="1.8" stroke="currentColor" strokeWidth="1.4"/>
      {/* liquid level dashes */}
      <line x1="6" y1="12.5" x2="16" y2="12.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2.5,2" strokeOpacity="0.5"/>
      {/* valve stem on top */}
      <line x1="11" y1="3.7" x2="11" y2="1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="8.8" y1="1.8" x2="13.2" y2="1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function checkTankDOE(data) {
  const t = data?.tankParams
  if (!t) return false
  if (!t.storageCapacity || t.storageCapacity <= 0) return false
  const p = t.params
  if (!p) return false
  const keys = ['specificInternalSize', 'specificSystemSize', 'specificTankWeight', 'specificTankCost']
  return keys.every(k => p[k] && p[k].value > 0)
}

export default function StorageTankNode({ selected, data }) {
  const doeStatus = checkTankDOE(data) ? 'ok' : 'error'
  return (
    <BaseNode
      icon={<Icon />}
      label={data?.label ?? 'Storage Tank'}
      selected={selected}
      doeStatus={doeStatus}
    />
  )
}
