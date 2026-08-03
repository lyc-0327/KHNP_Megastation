import BaseNode from './BaseNode.jsx'

function Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7.5"  y1="5" x2="7.5"  y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="11"   y1="5" x2="11"   y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="14.5" y1="5" x2="14.5" y2="17" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  )
}

// DOE met when: input entered (inputValue > 0) → h2Rate > 0 AND power > 0
function checkH2DOE(data) {
  const h2 = data?.h2Params
  if (!h2) return false
  if (!h2.inputValue || h2.inputValue <= 0) return false
  if (!h2.h2Rate    || h2.h2Rate    <= 0) return false
  if (!h2.power     || h2.power     <= 0) return false
  return true
}

export default function HydrogenProductionNode({ selected, data }) {
  const doeStatus = checkH2DOE(data) ? 'ok' : 'error'
  return (
    <BaseNode
      icon={<Icon />}
      label={data?.label ?? 'H₂ Production'}
      selected={selected}
      doeStatus={doeStatus}
    />
  )
}
