import { useState, useEffect } from 'react'

const TYPE_META = {
  hydrogenProduction: { label: 'H₂ Production',  color: '#3B82F6' },
  storageTank:        { label: 'Storage Tank',    color: '#10B981' },
  compressor:         { label: 'Compressor',      color: '#F59E0B' },
  pipeline:           { label: 'Pipeline',        color: '#64748B' },
  truck:              { label: 'Truck Transport', color: '#8B5CF6' },
  demandNode:         { label: 'Demand Node',     color: '#EF4444' },
}

// ── Inline H₂ logic (mirrors NodeModal to avoid import issues) ────────

const H2_SCHEMA = {
  lhv:              { label: 'LHV',              group:'A', defaultValue:120,   defaultUnit:'MJ/kg-H₂',  units:['MJ/kg-H₂','kWh/kg-H₂'] },
  efficiency:       { label: '전해조 효율',        group:'A', defaultValue:62,    defaultUnit:'%',         units:['%'] },
  specificPower:    { label: '단위 전력 소모량',   group:'A', defaultValue:53.8,  defaultUnit:'kWh/kg-H₂', units:['kWh/kg-H₂'] },
  waterConsumption: { label: '이론 물 소모량',     group:'B', defaultValue:9,     defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'] },
  waterTreatment:   { label: '수처리 물 소모량',   group:'B', defaultValue:15,    defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'] },
  coolingFactor:    { label: '냉각수 보정 계수',   group:'B', defaultValue:19,    defaultUnit:'%',         units:['%'] },
  totalWater:       { label: '총 물 소모량',       group:'B', defaultValue:28.56, defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'] },
}
const GRP_A = ['lhv', 'efficiency', 'specificPower']
const GRP_B = ['waterConsumption', 'waterTreatment', 'coolingFactor', 'totalWater']

function lhvToKwh(v, unit) { return unit === 'MJ/kg-H₂' ? v / 3.6 : v }
function calcAutoA(params, key) {
  const lhv = lhvToKwh(params.lhv.value, params.lhv.unit), eff = params.efficiency.value / 100, sp = params.specificPower.value
  if (key === 'specificPower') return eff > 0 ? +(lhv / eff).toFixed(3) : 0
  if (key === 'efficiency')    return sp  > 0 ? +(lhv / sp * 100).toFixed(3) : 0
  if (key === 'lhv') { const k = sp * eff; return params.lhv.unit === 'MJ/kg-H₂' ? +(k * 3.6).toFixed(3) : +k.toFixed(3) }
  return 0
}
function calcAutoB(params, key) {
  const w = params.waterConsumption.value, wt = params.waterTreatment.value, cf = params.coolingFactor.value / 100, tw = params.totalWater.value
  if (key === 'totalWater')       return +((w + wt) * (1 + cf)).toFixed(3)
  if (key === 'waterConsumption') return (1 + cf) > 0 ? +(tw / (1 + cf) - wt).toFixed(3) : 0
  if (key === 'waterTreatment')   return (1 + cf) > 0 ? +(tw / (1 + cf) - w).toFixed(3) : 0
  if (key === 'coolingFactor')    return (w + wt)  > 0 ? +((tw / (w + wt) - 1) * 100).toFixed(3) : 0
  return 0
}
function mkDefaultH2() {
  const p = {}
  for (const [k, s] of Object.entries(H2_SCHEMA)) p[k] = { value: s.defaultValue, unit: s.defaultUnit }
  return p
}
function getDisplayParams(h2Data) {
  const params   = h2Data?.params   ?? mkDefaultH2()
  const checkedA = new Set(h2Data?.checkedA ?? ['lhv', 'efficiency'])
  const checkedB = new Set(h2Data?.checkedB ?? ['waterConsumption', 'waterTreatment', 'coolingFactor'])
  const autoKeyA = checkedA.size === 2 ? GRP_A.find(k => !checkedA.has(k)) : null
  const autoKeyB = checkedB.size === 3 ? GRP_B.find(k => !checkedB.has(k)) : null
  const display  = { ...params }
  if (autoKeyA) display[autoKeyA] = { ...params[autoKeyA], value: calcAutoA(params, autoKeyA) }
  if (autoKeyB) display[autoKeyB] = { ...params[autoKeyB], value: calcAutoB(params, autoKeyB) }
  return { display, autoKeyA, autoKeyB }
}

// ── Area constants (mirrors NodeModal) ───────────────────────────────

const UNIT_AREA        = { 1:100, 2:200, 5:500, 10:1000, 100:10000 }  // m² per unit
const TANK_AREA_FACTOR = { '350': 0.05, '700': 0.04 }                 // m²/kg-H₂

// ── Inline Storage Tank logic ─────────────────────────────────────────

const TANK_PARAM_LABELS = {
  specificInternalSize: { label: 'Specific Internal Tank Size', unit: 'L/kg-H₂'  },
  specificSystemSize:   { label: 'Specific System Size',        unit: 'L/kg-H₂'  },
  specificTankWeight:   { label: 'Specific Tank Weight',        unit: 'kg/kg-H₂' },
  specificTankCost:     { label: 'Specific Tank Cost',          unit: '$/kg-H₂'  },
}
const TANK_PARAM_KEYS = ['specificInternalSize', 'specificSystemSize', 'specificTankWeight', 'specificTankCost']

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('en-US')
}

// ── Sub-components ────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:'#1E293B' }} />
    </div>
  )
}

// ── H₂ Production summary ─────────────────────────────────────────────

function H2ParamsSummary({ h2Data }) {
  const { display, autoKeyA, autoKeyB } = getDisplayParams(h2Data)

  const inputMode  = h2Data?.inputMode  ?? 'h2'
  const inputValue = h2Data?.inputValue ?? 0
  const h2Rate     = h2Data?.h2Rate     ?? 0
  const waterTotal = h2Data?.waterTotal ?? 0
  const power      = h2Data?.power      ?? 0
  const hasInput   = inputValue > 0

  const renderRow = (key, autoKey) => {
    const s = H2_SCHEMA[key], { value, unit } = display[key], isAuto = autoKey === key
    return (
      <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px', borderBottom:'1px solid #0d1117', background: isAuto ? '#080e18' : 'transparent' }}>
        <span style={{ fontSize:9.5, color: isAuto ? '#4B5563' : '#64748B', flex:1, minWidth:0 }}>{s.label}</span>
        {isAuto && <span style={{ fontSize:7.5, color:'#10B981', fontWeight:700, marginRight:6, flexShrink:0 }}>AUTO</span>}
        <span style={{ fontSize:9.5, color: isAuto ? '#4B5563' : '#94A3B8', fontFamily:'monospace', flexShrink:0 }}>{value}</span>
        <span style={{ fontSize:8, color:'#374151', marginLeft:4, flexShrink:0, minWidth:52, textAlign:'right' }}>{unit}</span>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* User Input results */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ fontSize:9, color:'#F59E0B', fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>계산 결과</span>
          <span style={{ fontSize:7.5, color:'#374151', fontStyle:'italic' }}>더블클릭하여 편집</span>
        </div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
            <span style={{ fontSize:9, color:'#475569' }}>입력 방식</span>
            <span style={{ fontSize:9, fontWeight:700, color: inputMode === 'water' ? '#60A5FA' : '#34D399' }}>
              {inputMode === 'water' ? '물 투입량' : '수소 생산량'}
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
            <span style={{ fontSize:9, color:'#475569' }}>{inputMode === 'water' ? '물 투입량' : '수소 생산량'}</span>
            <span style={{ fontSize:9.5, color: hasInput ? '#E2E8F0' : '#374151', fontFamily:'monospace' }}>
              {hasInput ? fmtNum(inputValue) : '—'} <span style={{ fontSize:8, color:'#374151' }}>kg/h</span>
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117', background:'#060c14' }}>
            <span style={{ fontSize:9, color: inputMode === 'water' ? '#34D399' : '#60A5FA' }}>
              {inputMode === 'water' ? '수소 생산량' : '총 물 소모량'}
            </span>
            <span style={{ fontSize:10, fontWeight:700, color: hasInput ? (inputMode === 'water' ? '#34D399' : '#60A5FA') : '#374151', fontFamily:'monospace' }}>
              {hasInput ? fmtNum(inputMode === 'water' ? h2Rate : waterTotal) : '—'} <span style={{ fontSize:8, fontWeight:400, color:'#374151' }}>kg/h</span>
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', background:'#060c14' }}>
            <span style={{ fontSize:9, color:'#F59E0B' }}>전력 소모량</span>
            <span style={{ fontSize:10, fontWeight:700, color: hasInput ? '#F59E0B' : '#374151', fontFamily:'monospace' }}>
              {hasInput ? fmtNum(power) : '—'} <span style={{ fontSize:8, fontWeight:400, color:'#374151' }}>kW</span>
            </span>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div>
        <div style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>Parameters</div>
        <div style={{ marginBottom:5 }}>
          <div style={{ fontSize:8, color:'#60A5FA', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:3 }}>에너지</div>
          <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
            {GRP_A.map(k => renderRow(k, autoKeyA))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:8, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:3 }}>물 소모</div>
          <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
            {GRP_B.map(k => renderRow(k, autoKeyB))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Storage Tank summary ──────────────────────────────────────────────

function StorageTankSummary({ tankData }) {
  const capacity = tankData?.storageCapacity ?? 0
  const pressure = tankData?.pressure ?? '350'
  const params   = tankData?.params ?? {}

  const cap = parseFloat(capacity) || 0
  const get  = (key) => parseFloat(params[key]?.value) || 0
  const iv   = cap > 0 ? +(cap * get('specificInternalSize')).toFixed(1) : null
  const sv   = cap > 0 ? +(cap * get('specificSystemSize')).toFixed(1)   : null
  const tw   = cap > 0 ? +(cap * get('specificTankWeight')).toFixed(1)   : null
  const tc   = cap > 0 ? +(cap * get('specificTankCost')).toFixed(0)     : null

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Storage Parameters</span>
        <span style={{ fontSize:8, color:'#374151', fontStyle:'italic' }}>더블클릭하여 편집</span>
      </div>

      {/* User inputs summary */}
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:8, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:3 }}>사용자 입력</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
            <span style={{ fontSize:10, color:'#64748B' }}>저장량</span>
            <span style={{ fontSize:10, color:'#94A3B8', fontFamily:'monospace' }}>
              {cap > 0 ? fmtNum(cap) : '—'}<span style={{ fontSize:8.5, color:'#374151', marginLeft:5 }}>kg-H₂</span>
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px' }}>
            <span style={{ fontSize:10, color:'#64748B' }}>저장 압력</span>
            <span style={{ fontSize:10, fontWeight:700, color: pressure === '700' ? '#A78BFA' : '#60A5FA', fontFamily:'monospace' }}>{pressure} bar</span>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:8, color:'#60A5FA', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:3 }}>파라미터</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
          {TANK_PARAM_KEYS.map(key => {
            const s = TANK_PARAM_LABELS[key]
            const v = params[key]?.value
            return (
              <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
                <span style={{ fontSize:9.5, color:'#64748B', flex:1, minWidth:0 }}>{s.label}</span>
                <span style={{ fontSize:9.5, color:'#94A3B8', fontFamily:'monospace', flexShrink:0 }}>
                  {v !== undefined ? v : '—'}
                  <span style={{ fontSize:8, color:'#374151', marginLeft:4 }}>{s.unit}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calculated results */}
      <div>
        <div style={{ fontSize:8, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:3 }}>계산 결과</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
          {[
            { label:'Internal Tank Volume', value:iv, unit:'L' },
            { label:'System Volume',        value:sv, unit:'L' },
            { label:'Tank Weight',          value:tw, unit:'kg' },
            { label:'Tank Cost',            value:tc, unit:'$', prefix:'$' },
          ].map(({ label, value, unit, prefix }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
              <span style={{ fontSize:9.5, color:'#64748B', flex:1, minWidth:0 }}>{label}</span>
              <span style={{ fontSize:9.5, color: value !== null ? '#F59E0B' : '#374151', fontFamily:'monospace', fontWeight: value !== null ? 600 : 400, flexShrink:0 }}>
                {value !== null ? `${prefix || ''}${fmtNum(value)}` : '—'}
                {value !== null && <span style={{ fontSize:8, color:'#374151', marginLeft:4, fontWeight:400 }}>{unit}</span>}
              </span>
            </div>
          ))}
        </div>
        {!cap && <p style={{ fontSize:9, color:'#374151', fontStyle:'italic', margin:'4px 0 0' }}>저장량 입력 후 결과가 표시됩니다</p>}
      </div>
    </div>
  )
}

// ── H₂ area summary ──────────────────────────────────────────────────

function H2AreaSummary({ h2Data }) {
  const unitMW          = h2Data?.unitMW ?? null
  const power           = h2Data?.power  ?? 0
  const unitAreaOverride = h2Data?.unitAreaOverride ?? UNIT_AREA
  const areaPerUnit     = unitMW ? (unitAreaOverride[unitMW] ?? UNIT_AREA[unitMW]) : null
  const numUnits        = unitMW && power > 0 ? Math.ceil(power / (unitMW * 1000)) : null
  const totalArea       = numUnits && areaPerUnit ? numUnits * areaPerUnit : null

  return (
    <div>
      <div style={{ fontSize:9, color:'#F59E0B', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>설치 면적 (Dummy)</div>
      <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
          <span style={{ fontSize:9.5, color:'#64748B' }}>단위 용량</span>
          <span style={{ fontSize:9.5, color: unitMW ? '#60A5FA' : '#374151', fontFamily:'monospace', fontWeight:700 }}>{unitMW ? `${unitMW} MW` : '—'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
          <span style={{ fontSize:9.5, color:'#64748B' }}>전해조 수량</span>
          <span style={{ fontSize:9.5, color: numUnits ? '#93C5FD' : '#374151', fontFamily:'monospace', fontWeight:700 }}>{numUnits != null ? `${numUnits.toLocaleString()} 기` : '—'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', background:'#060c14' }}>
          <span style={{ fontSize:9.5, color:'#F59E0B' }}>총 면적</span>
          <span style={{ fontSize:10, fontWeight:700, color: totalArea ? '#F59E0B' : '#374151', fontFamily:'monospace' }}>
            {totalArea != null ? totalArea.toLocaleString() : '—'}<span style={{ fontSize:8, fontWeight:400, color:'#374151', marginLeft:4 }}>m²</span>
          </span>
        </div>
      </div>
      {!unitMW && <p style={{ fontSize:9, color:'#374151', fontStyle:'italic', margin:'4px 0 0' }}>모달에서 단위 용량 선택 후 표시됩니다</p>}
    </div>
  )
}

// ── Storage Tank area summary ─────────────────────────────────────────

function TankAreaSummary({ tankData }) {
  const capacity           = parseFloat(tankData?.storageCapacity) || 0
  const pressure           = tankData?.pressure ?? '350'
  const areaFactorOverride = tankData?.areaFactorOverride ?? TANK_AREA_FACTOR
  const factor             = areaFactorOverride[pressure] ?? TANK_AREA_FACTOR[pressure]
  const totalArea          = capacity > 0 ? +(capacity * factor).toFixed(1) : null

  return (
    <div>
      <div style={{ fontSize:9, color:'#F59E0B', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>설치 면적 (Dummy)</div>
      <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:5, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', borderBottom:'1px solid #0d1117' }}>
          <span style={{ fontSize:9.5, color:'#64748B' }}>면적 계수</span>
          <span style={{ fontSize:9.5, color:'#94A3B8', fontFamily:'monospace' }}>{factor} <span style={{ fontSize:8, color:'#374151' }}>m²/kg-H₂</span></span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', background:'#060c14' }}>
          <span style={{ fontSize:9.5, color:'#F59E0B' }}>총 면적</span>
          <span style={{ fontSize:10, fontWeight:700, color: totalArea ? '#F59E0B' : '#374151', fontFamily:'monospace' }}>
            {totalArea != null ? fmtNum(totalArea) : '—'}<span style={{ fontSize:8, fontWeight:400, color:'#374151', marginLeft:4 }}>m²</span>
          </span>
        </div>
      </div>
      {!capacity && <p style={{ fontSize:9, color:'#374151', fontStyle:'italic', margin:'4px 0 0' }}>모달에서 저장 용량 입력 후 표시됩니다</p>}
    </div>
  )
}

// ── PropertiesPanel ───────────────────────────────────────────────────

export default function PropertiesPanel({ node, onClose, onDelete, onLabelChange }) {
  const [label, setLabel] = useState('')

  useEffect(() => { setLabel(node?.data?.label ?? '') }, [node?.id])

  if (!node) return null

  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#3B82F6' }

  return (
    <div style={{ width:240, background:'#0F172A', borderLeft:'1px solid #1E293B', display:'flex', flexDirection:'column', flexShrink:0, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', background:'#0A0F1A', borderBottom:'1px solid #1E293B', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:1.2, textTransform:'uppercase' }}>Properties</span>
        <button onClick={onClose} style={{ width:22, height:22, background:'none', border:'none', borderRadius:4, cursor:'pointer', color:'#475569', fontSize:18, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}
          onMouseEnter={e => (e.currentTarget.style.color='#94A3B8')} onMouseLeave={e => (e.currentTarget.style.color='#475569')}>×</button>
      </div>

      {/* Type badge */}
      <div style={{ padding:'12px 14px 0' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 9px', background:`${meta.color}18`, border:`1px solid ${meta.color}44`, borderRadius:20, fontSize:10, fontWeight:600, color:meta.color, letterSpacing:.3 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:meta.color, display:'inline-block' }} />
          {meta.label}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, padding:'14px', display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
        <Field label="Label">
          <input value={label} onChange={e => { setLabel(e.target.value); onLabelChange(node.id, e.target.value) }}
            onFocus={e => (e.target.style.borderColor = meta.color)} onBlur={e => (e.target.style.borderColor='#1E293B')}
            style={{ width:'100%', padding:'6px 10px', background:'#1E293B', border:'1px solid #1E293B', borderRadius:5, fontSize:12, color:'#E2E8F0', outline:'none', fontFamily:'system-ui', transition:'border-color 0.15s', boxSizing:'border-box' }} />
        </Field>

        {/* H₂ Production parameters summary */}
        {node.type === 'hydrogenProduction' && (
          <>
            <div style={{ height:1, background:'#1E293B', margin:'0 -14px', width:'calc(100% + 28px)' }} />
            <H2ParamsSummary h2Data={node.data?.h2Params} />
            <H2AreaSummary h2Data={node.data?.h2Params} />
          </>
        )}

        {/* Storage Tank parameters summary */}
        {node.type === 'storageTank' && (
          <>
            <div style={{ height:1, background:'#1E293B', margin:'0 -14px', width:'calc(100% + 28px)' }} />
            <StorageTankSummary tankData={node.data?.tankParams} />
            <TankAreaSummary tankData={node.data?.tankParams} />
          </>
        )}
      </div>

      {/* Delete */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid #1E293B' }}>
        <button onClick={() => onDelete(node.id)} style={{ width:'100%', padding:'7px', background:'transparent', border:'1px solid #3B1515', borderRadius:5, color:'#F87171', fontSize:11, fontWeight:600, cursor:'pointer', letterSpacing:.3, transition:'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#3B1515'; e.currentTarget.style.borderColor='#F87171' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='#3B1515' }}>Remove Node</button>
      </div>
    </div>
  )
}
