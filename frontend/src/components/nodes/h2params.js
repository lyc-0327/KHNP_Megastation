// Shared schema and calculation logic for H₂ Production parameters

export const H2_SCHEMA = {
  // Group A — any 2 of 3 → auto-compute the remaining one
  // Formula: efficiency (%) = LHV (kWh/kg) / specificPower (kWh/kg) × 100
  lhv: {
    label: 'LHV',
    group: 'A',
    defaultValue: 120,
    defaultUnit: 'MJ/kg-H₂',
    units: ['MJ/kg-H₂', 'kWh/kg-H₂'],
    desc: '수소 1 kg이 완전 연소 시 방출하는 화학 에너지 (저위발열량 기준)',
    ref: '',
  },
  efficiency: {
    label: '전해조 효율',
    group: 'A',
    defaultValue: 62,
    defaultUnit: '%',
    units: ['%'],
    desc: '전기 에너지가 수소 화학 에너지로 변환되는 비율',
    ref: 'Nature Communications (2023) 14:5532',
  },
  specificPower: {
    label: '단위 전력 소모량',
    group: 'A',
    defaultValue: 53.8,
    defaultUnit: 'kWh/kg-H₂',
    units: ['kWh/kg-H₂'],
    desc: '수소 1 kg 생산에 필요한 전기 에너지',
    ref: 'Nature Communications (2023) 14:5532',
  },
  // Group B — any 3 of 4 → auto-compute the remaining one
  // Formula: (waterConsumption + waterTreatment) × (1 + coolingFactor/100) = totalWater
  waterConsumption: {
    label: '이론 물 소모량',
    group: 'B',
    defaultValue: 9,
    defaultUnit: 'L/kg-H₂',
    units: ['L/kg-H₂'],
    desc: '전기분해 반응식 기준 수소 생산에 필요한 이론적 물 사용량',
    ref: 'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.',
  },
  waterTreatment: {
    label: '수처리 물 소모량',
    group: 'B',
    defaultValue: 15,
    defaultUnit: 'L/kg-H₂',
    units: ['L/kg-H₂'],
    desc: '수처리 과정에서 발생하는 추가 물 소모량',
    ref: 'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.',
  },
  coolingFactor: {
    label: '냉각수 보정 계수',
    group: 'B',
    defaultValue: 19,
    defaultUnit: '%',
    units: ['%'],
    desc: '전해조 운전 중 열 제거를 위한 냉각수 요구량 보정 계수 (총 물 소모량 대비)',
    ref: 'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.',
  },
  totalWater: {
    label: '총 물 소모량',
    group: 'B',
    defaultValue: 28.56,
    defaultUnit: 'L/kg-H₂',
    units: ['L/kg-H₂'],
    desc: '전해조 운전의 총 물 소모량 = (이론 + 수처리) × (1 + 냉각수 계수)',
    ref: '',
  },
}

export const GRP_A = ['lhv', 'efficiency', 'specificPower']
export const GRP_B = ['waterConsumption', 'waterTreatment', 'coolingFactor', 'totalWater']

function lhvToKwh(value, unit) {
  return unit === 'MJ/kg-H₂' ? value / 3.6 : value
}

export function calcAutoA(params, key) {
  const lhv = lhvToKwh(params.lhv.value, params.lhv.unit)
  const eff = params.efficiency.value / 100
  const sp  = params.specificPower.value
  if (key === 'specificPower') return eff > 0 ? +(lhv / eff).toFixed(3) : 0
  if (key === 'efficiency')    return sp  > 0 ? +(lhv / sp * 100).toFixed(3) : 0
  if (key === 'lhv') {
    const kWh = sp * eff
    return params.lhv.unit === 'MJ/kg-H₂' ? +(kWh * 3.6).toFixed(3) : +kWh.toFixed(3)
  }
  return 0
}

export function calcAutoB(params, key) {
  const w  = params.waterConsumption.value
  const wt = params.waterTreatment.value
  const cf = params.coolingFactor.value / 100
  const tw = params.totalWater.value
  if (key === 'totalWater')       return +((w + wt) * (1 + cf)).toFixed(3)
  if (key === 'waterConsumption') return (1 + cf) > 0 ? +(tw / (1 + cf) - wt).toFixed(3) : 0
  if (key === 'waterTreatment')   return (1 + cf) > 0 ? +(tw / (1 + cf) - w).toFixed(3) : 0
  if (key === 'coolingFactor')    return (w + wt) > 0 ? +((tw / (w + wt) - 1) * 100).toFixed(3) : 0
  return 0
}

export function mkDefaultH2Params() {
  const p = {}
  for (const [k, s] of Object.entries(H2_SCHEMA))
    p[k] = { value: s.defaultValue, unit: s.defaultUnit }
  return p
}

export function getDisplayParams(h2Data) {
  const params   = h2Data?.params   ?? mkDefaultH2Params()
  const checkedA = new Set(h2Data?.checkedA ?? ['lhv', 'efficiency'])
  const checkedB = new Set(h2Data?.checkedB ?? ['waterConsumption', 'waterTreatment', 'coolingFactor'])
  const autoKeyA = checkedA.size === 2 ? GRP_A.find(k => !checkedA.has(k)) : null
  const autoKeyB = checkedB.size === 3 ? GRP_B.find(k => !checkedB.has(k)) : null
  const display = { ...params }
  if (autoKeyA) display[autoKeyA] = { ...params[autoKeyA], value: calcAutoA(params, autoKeyA) }
  if (autoKeyB) display[autoKeyB] = { ...params[autoKeyB], value: calcAutoB(params, autoKeyB) }
  return { display, autoKeyA, autoKeyB }
}
