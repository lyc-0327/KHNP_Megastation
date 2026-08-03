import { useState, useEffect, useRef } from 'react'

// ── Type meta ──────────────────────────────────────────────────────────
const TYPE_META = {
  hydrogenProduction: { label: 'H₂ Production',  color: '#3B82F6' },
  storageTank:        { label: 'Storage Tank',    color: '#10B981' },
  compressor:         { label: 'Compressor',      color: '#F59E0B' },
  pipeline:           { label: 'Pipeline',        color: '#64748B' },
  truck:              { label: 'Truck Transport', color: '#8B5CF6' },
  demandNode:         { label: 'Demand Node',     color: '#EF4444' },
}

// ════════════════════════════════════════════════════════════════════
//  H₂ PRODUCTION — Schema & Calculations
// ════════════════════════════════════════════════════════════════════
const H2_SCHEMA = {
  lhv:              { label:'LHV',             group:'A', defaultValue:120,   defaultUnit:'MJ/kg-H₂',  units:['MJ/kg-H₂','kWh/kg-H₂'], desc:'수소 1 kg이 완전 연소 시 방출하는 화학 에너지 (저위발열량 기준)', ref:'' },
  efficiency:       { label:'전해조 효율',       group:'A', defaultValue:62,    defaultUnit:'%',         units:['%'],                     desc:'전기 에너지가 수소 화학 에너지로 변환되는 비율', ref:'Nature Communications (2023) 14:5532' },
  specificPower:    { label:'단위 전력 소모량',  group:'A', defaultValue:53.8,  defaultUnit:'kWh/kg-H₂', units:['kWh/kg-H₂'],             desc:'수소 1 kg 생산에 필요한 전기 에너지', ref:'Nature Communications (2023) 14:5532' },
  waterConsumption: { label:'이론 물 소모량',    group:'B', defaultValue:9,     defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'],               desc:'전기분해 반응식 기준 수소 생산에 필요한 이론적 물 사용량', ref:'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.' },
  waterTreatment:   { label:'수처리 물 소모량',  group:'B', defaultValue:15,    defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'],               desc:'수처리 과정에서 발생하는 추가 물 소모량', ref:'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.' },
  coolingFactor:    { label:'냉각수 보정 계수',  group:'B', defaultValue:19,    defaultUnit:'%',         units:['%'],                     desc:'전해조 운전 중 열 제거를 위한 냉각수 요구량 보정 계수', ref:'Lampert, D. J. et al. (2015). ANL/ESD-15/27, Argonne National Lab.' },
  totalWater:       { label:'총 물 소모량',      group:'B', defaultValue:28.56, defaultUnit:'L/kg-H₂',   units:['L/kg-H₂'],               desc:'전해조 운전의 총 물 소모량 = (이론 + 수처리) × (1 + 냉각수 계수)', ref:'' },
}
const GRP_A = ['lhv', 'efficiency', 'specificPower']
const GRP_B = ['waterConsumption', 'waterTreatment', 'coolingFactor', 'totalWater']

// Electrolyzer unit capacities for stack sizing
const UNIT_OPTIONS = [1, 2, 5, 10, 100]  // MW
const UNIT_AREA    = { 1:100, 2:200, 5:500, 10:1000, 100:10000 }  // m² per unit

// Storage tank area factors (m²/kg-H₂)
const TANK_AREA_FACTOR = { '350': 0.05, '700': 0.04 }

function lhvToKwh(v, unit) { return unit === 'MJ/kg-H₂' ? v / 3.6 : v }
function calcAutoA(p, key) {
  const lhv = lhvToKwh(p.lhv.value, p.lhv.unit), eff = p.efficiency.value / 100, sp = p.specificPower.value
  if (key === 'specificPower') return eff > 0 ? +(lhv / eff).toFixed(3) : 0
  if (key === 'efficiency')    return sp  > 0 ? +(lhv / sp * 100).toFixed(3) : 0
  if (key === 'lhv') { const k = sp * eff; return p.lhv.unit === 'MJ/kg-H₂' ? +(k * 3.6).toFixed(3) : +k.toFixed(3) }
  return 0
}
function calcAutoB(p, key) {
  const w = p.waterConsumption.value, wt = p.waterTreatment.value, cf = p.coolingFactor.value / 100, tw = p.totalWater.value
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
function resolveH2(params, checkedA, checkedB, mode, val) {
  const autoA = checkedA.size === 2 ? GRP_A.find(k => !checkedA.has(k)) : null
  const autoB = checkedB.size === 3 ? GRP_B.find(k => !checkedB.has(k)) : null
  const disp = { ...params }
  if (autoA) disp[autoA] = { ...params[autoA], value: calcAutoA(params, autoA) }
  if (autoB) disp[autoB] = { ...params[autoB], value: calcAutoB(params, autoB) }
  const waterCons = disp.waterConsumption.value, totalW = disp.totalWater.value, specPow = disp.specificPower.value
  const inp = parseFloat(val) || 0
  let h2Rate = 0, waterTotal = 0, power = 0
  if (mode === 'water') {
    h2Rate     = waterCons > 0 ? +(inp / waterCons).toFixed(3) : 0
    waterTotal = +(h2Rate * totalW).toFixed(2)
    power      = +(h2Rate * specPow).toFixed(2)
  } else {
    h2Rate     = inp
    waterTotal = +(inp * totalW).toFixed(2)
    power      = +(inp * specPow).toFixed(2)
  }
  return { disp, autoA, autoB, h2Rate, waterTotal, power }
}

// ════════════════════════════════════════════════════════════════════
//  STORAGE TANK — Schema, Presets & Calculations
// ════════════════════════════════════════════════════════════════════
const TANK_REF = 'Cheng, Q., Zhang, R., Shi, Z., & Lin, J. (2024). Int. J. Lightweight Mater. Manuf., 7(2), 269–284.'
const TANK_PARAM_SCHEMA = {
  specificInternalSize: { label:'Specific Internal Tank Size', unit:'L/kg-H₂',  desc:'수소 1 kg 저장에 필요한 탱크 내부 용적.', ref:TANK_REF },
  specificSystemSize:   { label:'Specific System Size',        unit:'L/kg-H₂',  desc:'수소 1 kg 저장 기준 전체 시스템 부피.', ref:TANK_REF },
  specificTankWeight:   { label:'Specific Tank Weight',        unit:'kg/kg-H₂', desc:'수소 저장 용량 대비 필요한 탱크 무게.', ref:TANK_REF },
  specificTankCost:     { label:'Specific Tank Cost',          unit:'$/kg-H₂',  desc:'단위 수소 저장 용량당 탱크 비용.', ref:TANK_REF },
}
const TANK_PARAM_KEYS = ['specificInternalSize', 'specificSystemSize', 'specificTankWeight', 'specificTankCost']
const TANK_PERF_KEYS  = ['specificInternalSize', 'specificSystemSize', 'specificTankWeight']
const TANK_PRESETS = {
  '350': { specificInternalSize:44, specificSystemSize:60,  specificTankWeight:25,   specificTankCost:600  },
  '700': { specificInternalSize:26, specificSystemSize:45,  specificTankWeight:12.5, specificTankCost:1600 },
}
function mkTankParams(pressure) {
  const preset = TANK_PRESETS[pressure], p = {}
  for (const key of TANK_PARAM_KEYS) p[key] = { value: preset[key], unit: TANK_PARAM_SCHEMA[key].unit }
  return p
}
function calcTankResults(capacity, params) {
  if (!capacity || capacity <= 0) return { internalVolume:null, systemVolume:null, tankWeight:null, tankCost:null }
  return {
    internalVolume: +(capacity * params.specificInternalSize.value).toFixed(1),
    systemVolume:   +(capacity * params.specificSystemSize.value).toFixed(1),
    tankWeight:     +(capacity * params.specificTankWeight.value).toFixed(1),
    tankCost:       +(capacity * params.specificTankCost.value).toFixed(0),
  }
}
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('en-US')
}

// ════════════════════════════════════════════════════════════════════
//  HELP DOCUMENTS
// ════════════════════════════════════════════════════════════════════
const DOC_STYLE = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;background:#f0efe8;color:#1a1a1a;font-size:10.5pt;line-height:1.65}.page{background:#fff;width:210mm;min-height:297mm;margin:24px auto;padding:22mm 20mm;box-shadow:0 4px 18px rgba(0,0,0,.18)}.bar{width:100%;height:6px;border-radius:2px;margin-bottom:28px}h1{font-size:19pt;font-weight:800;color:#1e3a5f;margin-bottom:4px}.subtitle{font-size:9.5pt;color:#64748b;margin-bottom:6px}.meta{font-size:8.5pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;margin-bottom:30px;display:flex;gap:24px}h2{font-size:13pt;font-weight:700;color:#1e3a5f;margin:28px 0 10px;display:flex;align-items:center;gap:8px}h2::before{content:'';display:inline-block;width:4px;height:18px;border-radius:2px;flex-shrink:0}p{margin-bottom:8px;color:#374151}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt}thead th{padding:8px 10px;text-align:left;font-weight:600;font-size:9pt;color:#fff}td{padding:7px 10px;border-bottom:1px solid #e9ecef;vertical-align:top;color:#374151}tr:nth-child(even) td{background:#f8fafc}.eq-box{border-radius:6px;padding:14px 18px;margin:12px 0}.eq-title{font-size:8.5pt;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px}.eq{font-family:'Courier New',monospace;font-size:10pt;margin:5px 0;padding:3px 0;border-bottom:1px dashed rgba(0,0,0,.1)}.eq:last-child{border-bottom:none}.note{padding:8px 12px;margin:10px 0;font-size:9.5pt;border-radius:0 4px 4px 0}.ref-list{margin:0;padding:0;list-style:none}.ref-list li{padding:6px 0 6px 16px;border-bottom:1px solid #f1f5f9;font-size:9.5pt;color:#475569;position:relative}.ref-list li::before{content:'[';position:absolute;left:0;color:#94a3b8}.badge{display:inline-block;font-size:8pt;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:6px;vertical-align:middle}@media print{body{background:#fff}.page{box-shadow:none;margin:0;width:100%;padding:15mm}}`

function getH2DocHTML() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>H₂ Production</title><style>${DOC_STYLE}.bar{background:linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)}h2::before{background:#3b82f6}thead th{background:#1e3a5f}.eq-box{background:#f0f6ff;border:1px solid #bfdbfe}.eq-title{color:#1d4ed8}.eq{color:#1e3a5f}.note{background:#fefce8;border-left:3px solid #eab308;color:#713f12}.badge{background:#dbeafe;color:#1d4ed8}</style></head><body><div class="page"><div class="bar"></div><h1>H₂ Production 시스템 모델</h1><div class="subtitle">PEM 수전해 기반 수소 생산 공정 · 파라미터 기술 문서</div><div class="meta"><span>버전 1.0</span><span>KHNP Hydrogen Megastation Platform</span><span>2025</span></div><h2>1. 에너지 파라미터</h2><table><thead><tr><th>파라미터</th><th>기본값</th><th>단위</th></tr></thead><tbody><tr><td>LHV</td><td>120</td><td>MJ/kg-H₂</td></tr><tr><td>전해조 효율</td><td>62</td><td>%</td></tr><tr><td>단위 전력 소모량</td><td>53.8</td><td>kWh/kg-H₂</td></tr></tbody></table><div class="eq-box"><div class="eq-title">관계식</div><div class="eq">η = LHV_kWh / P_sp × 100</div><div class="eq">P_sp = LHV_kWh / (η / 100)</div></div><h2>2. 물 소모 파라미터</h2><table><thead><tr><th>파라미터</th><th>기본값</th><th>단위</th></tr></thead><tbody><tr><td>이론 물 소모량 W</td><td>9</td><td>L/kg-H₂</td></tr><tr><td>수처리 물 소모량 W_t</td><td>15</td><td>L/kg-H₂</td></tr><tr><td>냉각수 보정 계수 f_c</td><td>19</td><td>%</td></tr><tr><td>총 물 소모량 W_total</td><td>28.56</td><td>L/kg-H₂</td></tr></tbody></table><div class="eq-box"><div class="eq-title">관계식</div><div class="eq">W_total = (W + W_t) × (1 + f_c / 100)</div></div><h2>3. 참고문헌</h2><ul class="ref-list"><li>1] Nature Communications (2023) 14:5532</li><li>2] Lampert, D. J. et al. ANL/ESD-15/27 (2015)</li></ul></div></body></html>`
}
function getTankDocHTML() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>Storage Tank</title><style>${DOC_STYLE}.bar{background:linear-gradient(90deg,#065f46,#10b981,#34d399)}h2::before{background:#10b981}thead th{background:#065f46}.eq-box{background:#f0fdf8;border:1px solid #a7f3d0}.eq-title{color:#065f46}.eq{color:#064e3b}</style></head><body><div class="page"><div class="bar"></div><h1>Storage Tank 시스템 모델</h1><div class="subtitle">압축 수소 저장 시스템 · 파라미터 기술 문서</div><div class="meta"><span>버전 1.0</span><span>KHNP Hydrogen Megastation Platform</span><span>2025</span></div><h2>1. 계산식</h2><div class="eq-box"><div class="eq-title">결과값 = 저장량 × 비례 파라미터</div><div class="eq">Internal Tank Volume [L] = 저장량 × Specific Internal Tank Size</div><div class="eq">System Volume [L] = 저장량 × Specific System Size</div><div class="eq">Tank Weight [kg] = 저장량 × Specific Tank Weight</div><div class="eq">Tank Cost [$] = 저장량 × Specific Tank Cost</div></div><h2>2. 참고문헌</h2><ul class="ref-list"><li>1] Cheng et al. (2024). Int. J. Lightweight Mater. Manuf., 7(2), 269–284.</li></ul></div></body></html>`
}

// ════════════════════════════════════════════════════════════════════
//  HELP MODAL
// ════════════════════════════════════════════════════════════════════
function HelpModal({ docHTML, title, onClose }) {
  const handleSavePDF = () => {
    const w = window.open('', '_blank', 'width=900,height=750')
    if (!w) return
    w.document.write(docHTML); w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 600)
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:10200, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width:760, maxWidth:'92vw', height:'88vh', background:'#fff', borderRadius:10, display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,.7)', overflow:'hidden' }}
        onMouseDown={e => e.stopPropagation()}>
        <div style={{ background:'#0f172a', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:14 }}>📄</span>
          <span style={{ color:'#e2e8f0', fontSize:12, fontWeight:600, flex:1 }}>{title}</span>
          <button onClick={handleSavePDF} style={{ background:'#3B82F6', border:'none', borderRadius:5, padding:'5px 13px', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>⬇ PDF 저장</button>
          <button onClick={onClose} style={{ width:26, height:26, background:'none', border:'1px solid #334155', borderRadius:5, color:'#94a3b8', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <iframe srcDoc={docHTML} style={{ flex:1, border:'none' }} title={title} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ROW CONTEXT MENU  (right-click on param row → reset / info)
// ════════════════════════════════════════════════════════════════════
function RowContextMenu({ x, y, label, canReset, onReset, onInfo, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => {
      const close = () => onClose()
      document.addEventListener('click', close)
      document.addEventListener('contextmenu', close)
      return () => { document.removeEventListener('click', close); document.removeEventListener('contextmenu', close) }
    }, 40)
    return () => clearTimeout(t)
  }, [onClose])

  const btn = { width:'100%', padding:'8px 14px', background:'none', border:'none', color:'#94A3B8', fontSize:12, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontFamily:'inherit' }
  const hover = e => { e.currentTarget.style.background='#1E3A5F'; e.currentTarget.style.color='#60A5FA' }
  const unhover = e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#94A3B8' }

  return (
    <div style={{ position:'fixed', top:y, left:x, zIndex:9999, background:'#141B2D', border:'1px solid #2D3F5C', borderRadius:6, boxShadow:'0 8px 28px rgba(0,0,0,.85)', minWidth:190, overflow:'hidden', padding:'3px 0' }}
      onClick={e => e.stopPropagation()} onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}>
      {label && <div style={{ padding:'6px 14px 4px', fontSize:10, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', borderBottom:'1px solid #1E293B', marginBottom:3 }}>{label}</div>}
      {canReset && (
        <button style={btn} onMouseEnter={hover} onMouseLeave={unhover} onClick={() => { onReset(); onClose() }}>
          <span style={{ fontSize:15 }}>↺</span> 기본값으로 초기화
        </button>
      )}
      <button style={btn} onMouseEnter={hover} onMouseLeave={unhover} onClick={() => { onInfo(); onClose() }}>
        <span style={{ fontSize:13 }}>ℹ</span> Information
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  INFO POPUP
// ════════════════════════════════════════════════════════════════════
function InfoPopup({ x, y, schema, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => {
      const close = () => onClose()
      document.addEventListener('click', close)
      document.addEventListener('contextmenu', close)
      return () => { document.removeEventListener('click', close); document.removeEventListener('contextmenu', close) }
    }, 40)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{ position:'fixed', top:y+8, left:x, zIndex:10000, background:'#141B2D', border:'1px solid #1E3A5F', borderRadius:8, boxShadow:'0 8px 30px rgba(0,0,0,.9)', width:310, padding:'14px 16px' }}
      onClick={e => e.stopPropagation()} onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <p style={{ fontSize:13, color:'#60A5FA', fontWeight:700, margin:0 }}>{schema.label}</p>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:18, padding:'0 0 0 10px', lineHeight:1 }}>×</button>
      </div>
      <p style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', margin:'0 0 5px' }}>Description</p>
      <p style={{ fontSize:12, color:'#94A3B8', lineHeight:1.7, margin:'0 0 12px' }}>{schema.desc}</p>
      {schema.ref && <>
        <p style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', margin:'0 0 4px' }}>Reference</p>
        <p style={{ fontSize:11, color:'#64748B', lineHeight:1.55, margin:0 }}>{schema.ref}</p>
      </>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  SHARED SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════
function Divider({ title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0 2px' }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:1.2, textTransform:'uppercase', whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:'#1E293B' }} />
    </div>
  )
}

function ResultRow({ label, value, unit, color = '#F59E0B', large = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid #0d1117' }}>
      <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>{label}</span>
      <span style={{ fontSize: large ? 15 : 14, color: value != null ? color : '#374151', fontFamily:'monospace', fontWeight:700 }}>{value != null ? fmtNum(value) : '—'}</span>
      <span style={{ fontSize:11, color:'#374151', marginLeft:4, whiteSpace:'nowrap' }}>{unit}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  H₂ PRODUCTION PARAMS  (tab-aware)
// ════════════════════════════════════════════════════════════════════
function H2Params({ initData, onChange, tab }) {
  const [params,          setParams]          = useState(() => initData?.params          ?? mkDefaultH2())
  const [checkedA,        setCheckedA]        = useState(() => new Set(initData?.checkedA ?? ['lhv', 'efficiency']))
  const [checkedB,        setCheckedB]        = useState(() => new Set(initData?.checkedB ?? ['waterConsumption', 'waterTreatment', 'coolingFactor']))
  const [inputMode,       setInputMode]       = useState(() => initData?.inputMode  ?? 'h2')
  const [inputValue,      setInputValue]      = useState(() => initData?.inputValue != null ? String(initData.inputValue) : '')
  const [unitMW,          setUnitMW]          = useState(() => initData?.unitMW ?? null)
  const [unitAreaOverride, setUnitAreaOverride] = useState(() => initData?.unitAreaOverride ?? { ...UNIT_AREA })
  const [rowCtxMenu, setRowCtxMenu] = useState(null)
  const [infoPopup,  setInfoPopup]  = useState(null)

  const { disp, autoA, autoB, h2Rate, waterTotal, power } =
    resolveH2(params, checkedA, checkedB, inputMode, inputValue)

  const push = (p, cA, cB, mode, val, uMW = unitMW, uArea = unitAreaOverride) => {
    const res = resolveH2(p, cA, cB, mode, val)
    onChange({ params:p, checkedA:[...cA], checkedB:[...cB], inputMode:mode, inputValue:parseFloat(val)||0, h2Rate:res.h2Rate, waterTotal:res.waterTotal, power:res.power, unitMW:uMW, unitAreaOverride:uArea })
  }

  const changeVal  = (key, raw) => { const next = { ...params, [key]:{ ...params[key], value:parseFloat(raw)||0 } }; setParams(next); push(next, checkedA, checkedB, inputMode, inputValue) }
  const changeUnit = (key, unit) => {
    let next = params
    if (key === 'lhv') { const v = params.lhv.value; const nv = unit === 'kWh/kg-H₂' ? +(v/3.6).toFixed(3) : +(v*3.6).toFixed(3); next = { ...params, lhv:{ value:nv, unit } } }
    else next = { ...params, [key]:{ ...params[key], unit } }
    setParams(next); push(next, checkedA, checkedB, inputMode, inputValue)
  }
  const toggleA = key => { const next = new Set(checkedA); next.has(key) ? next.delete(key) : next.size < 2 && next.add(key); setCheckedA(next); push(params, next, checkedB, inputMode, inputValue) }
  const toggleB = key => { const next = new Set(checkedB); next.has(key) ? next.delete(key) : next.size < 3 && next.add(key); setCheckedB(next); push(params, checkedA, next, inputMode, inputValue) }

  const openRowCtx = (e, key, isAuto, checkedSet, toggleFn) => {
    e.preventDefault(); e.stopPropagation()
    const s = H2_SCHEMA[key]
    setRowCtxMenu({
      x: e.clientX, y: e.clientY, schema: s,
      canReset: !isAuto,
      onReset: () => {
        const next = { ...params, [key]:{ value:s.defaultValue, unit:s.defaultUnit } }
        setParams(next); push(next, checkedA, checkedB, inputMode, inputValue)
      },
    })
  }

  const renderRow = (key, checkedSet, toggleFn, autoKey) => {
    const s = H2_SCHEMA[key], isAuto = autoKey === key, isChecked = checkedSet.has(key)
    return (
      <div key={key} onContextMenu={e => openRowCtx(e, key, isAuto, checkedSet, toggleFn)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:'1px solid #0d1117', cursor:'context-menu' }}>
        <input type="checkbox" checked={isChecked} onChange={() => toggleFn(key)} onClick={e => e.stopPropagation()} disabled={isAuto}
          style={{ width:14, height:14, accentColor:'#3B82F6', flexShrink:0, margin:0 }} />
        <span style={{ flex:1, fontSize:13, color: isAuto ? '#4B5563' : '#94A3B8', minWidth:0 }}>{s.label}</span>
        {isAuto && <span style={{ fontSize:9, color:'#10B981', fontWeight:700, flexShrink:0 }}>AUTO</span>}
        <input type="number" step="any" value={disp[key].value} disabled={isAuto}
          onChange={e => !isAuto && changeVal(key, e.target.value)}
          onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}
          style={{ width:86, textAlign:'right', flexShrink:0, background: isAuto ? '#0a0f1a' : '#1E293B', border:`1px solid ${isAuto ? '#1E293B' : '#334155'}`, borderRadius:4, padding:'5px 22px 5px 7px', color: isAuto ? '#4B5563' : '#E2E8F0', fontSize:13, outline:'none', fontFamily:'monospace' }} />
        {s.units.length > 1 ? (
          <select value={disp[key].unit} onChange={e => changeUnit(key, e.target.value)} onClick={e => e.stopPropagation()} disabled={isAuto}
            style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:4, padding:'5px 4px', color:'#64748B', fontSize:10, cursor:'pointer', outline:'none', flexShrink:0 }}>
            {s.units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        ) : (
          <div style={{ background:'#0a0f1a', border:'1px solid #1E293B', borderRadius:4, padding:'5px 7px', color:'#374151', fontSize:10, whiteSpace:'nowrap', flexShrink:0 }}>{s.units[0]}</div>
        )}
      </div>
    )
  }

  const inp = parseFloat(inputValue) || 0
  const hasResult = inp > 0

  // ── Tab: Input ──────────────────────────────────────────────────
  if (tab === 'input') return (
    <>
      <div>
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:8 }}>입력 방식</div>
        <div style={{ display:'flex', gap:6 }}>
          {[{ key:'water', label:'물 투입량', sub:'feedwater' }, { key:'h2', label:'수소 생산량', sub:'H₂ production' }].map(({ key, label, sub }) => (
            <button key={key} onClick={() => { setInputMode(key); push(params, checkedA, checkedB, key, inputValue) }}
              style={{ flex:1, padding:'9px 6px', borderRadius:6, cursor:'pointer', background: inputMode===key ? '#1E3A5F' : '#0a0f1a', border:`1.5px solid ${inputMode===key ? '#3B82F6' : '#334155'}`, color: inputMode===key ? '#93C5FD' : '#475569', textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>
          {inputMode === 'water' ? '물 투입량 (이론 피드워터)' : '수소 생산량'}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input type="number" step="any" min="0" value={inputValue} placeholder="0"
            onChange={e => { setInputValue(e.target.value); push(params, checkedA, checkedB, inputMode, e.target.value) }}
            style={{ flex:1, background:'#1E293B', border:'1px solid #3B82F6', borderRadius:6, padding:'10px 12px', color:'#E2E8F0', fontSize:15, outline:'none', fontFamily:'monospace' }} />
          <div style={{ background:'#0a0f1a', border:'1px solid #1E293B', borderRadius:6, padding:'10px 13px', color:'#475569', fontSize:13, display:'flex', alignItems:'center' }}>kg/h</div>
        </div>
        <div style={{ fontSize:11, color:'#374151', marginTop:5, fontStyle:'italic' }}>
          {inputMode === 'water' ? '전기분해에 직접 투입되는 이론 물 소모량 기준 (수처리·냉각수 제외)' : '목표 수소 생산량을 입력하면 소모량이 계산됩니다'}
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>계산 결과</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          {inputMode === 'water' ? (
            <ResultRow label="수소 생산량" value={hasResult ? h2Rate : null} unit="kg/h" color="#34D399" large />
          ) : (
            <ResultRow label="총 물 소모량" value={hasResult ? waterTotal : null} unit="kg/h" color="#60A5FA" large />
          )}
          <ResultRow label="전력 소모량" value={hasResult ? power : null} unit="kW" color="#F59E0B" large />
        </div>
        {inputMode === 'water' && hasResult && (
          <div style={{ fontSize:11, color:'#374151', marginTop:5, fontStyle:'italic' }}>총 물 소모량 (수처리·냉각 포함): {fmtNum(waterTotal)} kg/h</div>
        )}
        {!hasResult && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'5px 0 0' }}>값을 입력하면 결과가 계산됩니다</p>}
      </div>

      {/* ── 전해조 단위 용량 선택 ── */}
      <div>
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>전해조 단위 용량</div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {UNIT_OPTIONS.map(mw => (
            <button key={mw} onClick={() => { setUnitMW(mw); push(params, checkedA, checkedB, inputMode, inputValue, mw) }}
              style={{ flex:'1 1 auto', minWidth:64, padding:'8px 6px', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer',
                background: unitMW===mw ? '#1E3A5F' : '#0a0f1a',
                border:`1.5px solid ${unitMW===mw ? '#3B82F6' : '#334155'}`,
                color: unitMW===mw ? '#93C5FD' : '#475569' }}>
              {mw}MW
            </button>
          ))}
          {unitMW && (
            <button onClick={() => { setUnitMW(null); push(params, checkedA, checkedB, inputMode, inputValue, null) }}
              style={{ padding:'8px 10px', borderRadius:6, fontSize:11, cursor:'pointer', background:'transparent', border:'1px solid #334155', color:'#475569' }}>✕</button>
          )}
        </div>
        {unitMW && hasResult && (() => {
          const numUnits = Math.ceil(power / (unitMW * 1000))
          return (
            <div style={{ marginTop:8, background:'#0A1628', border:'1px solid #1E3A5F', borderRadius:6, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'#60A5FA', fontFamily:'monospace', fontWeight:700 }}>{unitMW}MW</span>
              <span style={{ fontSize:13, color:'#475569' }}>×</span>
              <span style={{ fontSize:15, color:'#93C5FD', fontFamily:'monospace', fontWeight:800 }}>{numUnits.toLocaleString()}개</span>
              <span style={{ marginLeft:'auto', fontSize:11, color:'#334155' }}>{fmtNum(Math.round(power))} kW 기준</span>
            </div>
          )
        })()}
        {unitMW && !hasResult && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'6px 0 0' }}>전력 소모량을 계산하면 단위 수가 표시됩니다</p>}
      </div>

      {rowCtxMenu && <RowContextMenu {...rowCtxMenu} onInfo={() => setInfoPopup({ x:rowCtxMenu.x, y:rowCtxMenu.y, schema:rowCtxMenu.schema })} onClose={() => setRowCtxMenu(null)} />}
      {infoPopup  && <InfoPopup {...infoPopup} onClose={() => setInfoPopup(null)} />}
    </>
  )

  // ── Tab: Performance ────────────────────────────────────────────
  if (tab === 'performance') return (
    <>
      <div>
        <div style={{ fontSize:11, color:'#60A5FA', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>에너지 파라미터</div>
        <div style={{ fontSize:11, color:'#374151', marginBottom:8, fontStyle:'italic' }}>우클릭 → 기본값 초기화 / 설명 보기</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>{GRP_A.map(k => renderRow(k, checkedA, toggleA, autoA))}</div>
      </div>
      <div>
        <div style={{ fontSize:11, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>물 소모 파라미터</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>{GRP_B.map(k => renderRow(k, checkedB, toggleB, autoB))}</div>
      </div>

      {rowCtxMenu && <RowContextMenu {...rowCtxMenu} onInfo={() => setInfoPopup({ x:rowCtxMenu.x, y:rowCtxMenu.y, schema:rowCtxMenu.schema })} onClose={() => setRowCtxMenu(null)} />}
      {infoPopup  && <InfoPopup {...infoPopup} onClose={() => setInfoPopup(null)} />}
    </>
  )

  // ── Tab: Economic ───────────────────────────────────────────────
  if (tab === 'economic') return (
    <div style={{ textAlign:'center', padding:'32px 16px', color:'#475569', fontSize:13 }}>
      경제성 파라미터는 추후 업데이트 예정입니다.
    </div>
  )

  // ── Tab: Dummy ─────────────────────────────────────────────────
  const numUnitsForDummy = unitMW && power > 0 ? Math.ceil(power / (unitMW * 1000)) : null
  const areaPerUnit = unitMW ? (unitAreaOverride[unitMW] ?? UNIT_AREA[unitMW]) : null
  const totalArea   = numUnitsForDummy ? numUnitsForDummy * areaPerUnit : null

  const handleAreaEdit = (mw, raw) => {
    const next = { ...unitAreaOverride, [mw]: parseFloat(raw) || 0 }
    setUnitAreaOverride(next)
    push(params, checkedA, checkedB, inputMode, inputValue, unitMW, next)
  }

  return (
    <>
      <div style={{ background:'#080E1A', border:'1px solid #334155', borderRadius:6, padding:'10px 14px', marginBottom:4 }}>
        <p style={{ fontSize:11, color:'#475569', margin:0, lineHeight:1.7 }}>
          ⚠ 아래 값들은 <strong style={{ color:'#F59E0B' }}>계산을 위해 사용하는 Dummy 값</strong>입니다.<br/>
          실제 설계 시 직접 수정 가능하며, 실제 설계 시 기자재 사양에 따라 별도 검토가 필요합니다.
        </p>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>용량별 설치 면적 (Dummy)</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          {UNIT_OPTIONS.map(mw => {
            const isSelected = unitMW === mw
            const areaVal = unitAreaOverride[mw] ?? UNIT_AREA[mw]
            return (
              <div key={mw} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderBottom:'1px solid #0d1117', background: isSelected ? '#0e1a2d' : 'transparent' }}>
                <span style={{ fontSize:13, color: isSelected ? '#60A5FA' : '#94A3B8', fontWeight: isSelected ? 700 : 400, minWidth:52, flexShrink:0 }}>{mw} MW</span>
                <span style={{ flex:1, fontSize:11, color:'#475569' }}>전해조 1기</span>
                <input
                  type="number" step="any" min="0" value={areaVal}
                  onChange={e => handleAreaEdit(mw, e.target.value)}
                  style={{ width:80, textAlign:'right', background: isSelected ? '#1A2A45' : '#1E293B', border:`1px solid ${isSelected ? '#3B82F6' : '#334155'}`, borderRadius:4, padding:'4px 22px 4px 7px', color: isSelected ? '#F59E0B' : '#94A3B8', fontSize:13, outline:'none', fontFamily:'monospace' }}
                />
                <span style={{ fontSize:11, color:'#374151', flexShrink:0 }}>m²</span>
                {isSelected && <span style={{ fontSize:9, color:'#3B82F6', fontWeight:700, background:'#1E3A5F', padding:'2px 6px', borderRadius:8, flexShrink:0 }}>선택됨</span>}
              </div>
            )
          })}
        </div>
      </div>

      {unitMW ? (
        <div>
          <div style={{ fontSize:11, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>면적 계산 결과</div>
          <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid #0d1117' }}>
              <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>단위 설치 면적</span>
              <span style={{ fontSize:14, color:'#94A3B8', fontFamily:'monospace', fontWeight:700 }}>{areaPerUnit?.toLocaleString() ?? '—'}</span>
              <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>m² / 기</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid #0d1117' }}>
              <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>전해조 수량</span>
              <span style={{ fontSize:14, color:'#60A5FA', fontFamily:'monospace', fontWeight:700 }}>{numUnitsForDummy != null ? numUnitsForDummy.toLocaleString() : '—'}</span>
              <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>기</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px' }}>
              <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>총 설치 면적</span>
              <span style={{ fontSize:15, color: totalArea ? '#34D399' : '#374151', fontFamily:'monospace', fontWeight:800 }}>{totalArea != null ? totalArea.toLocaleString() : '—'}</span>
              <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>m²</span>
            </div>
          </div>
          {!numUnitsForDummy && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'5px 0 0' }}>Input 탭에서 전력 소모량을 계산하면 총 면적이 표시됩니다</p>}
        </div>
      ) : (
        <p style={{ fontSize:12, color:'#374151', fontStyle:'italic', textAlign:'center', padding:'12px 0' }}>
          Input 탭에서 전해조 단위 용량을 선택하면 면적이 계산됩니다
        </p>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
//  STORAGE TANK PARAMS  (tab-aware, upstream auto-capacity)
// ════════════════════════════════════════════════════════════════════
function StorageTankParams({ initData, onChange, upstreamH2Rate, tab }) {
  const [capacity,           setCapacity]           = useState(() => initData?.storageCapacity ? String(initData.storageCapacity) : '')
  const [pressure,           setPressure]           = useState(() => initData?.pressure ?? '350')
  const [params,             setParams]             = useState(() => initData?.params ?? mkTankParams('350'))
  const [areaFactorOverride, setAreaFactorOverride] = useState(() => initData?.areaFactorOverride ?? { ...TANK_AREA_FACTOR })
  const [rowCtxMenu, setRowCtxMenu] = useState(null)
  const [infoPopup,  setInfoPopup]  = useState(null)

  const isAuto       = upstreamH2Rate > 0
  const effectiveCap = isAuto ? upstreamH2Rate : (parseFloat(capacity) || 0)
  const results      = calcTankResults(effectiveCap, params)

  const push = (cap, pres, pars, aFactors = areaFactorOverride) => {
    const effCap = upstreamH2Rate > 0 ? upstreamH2Rate : (parseFloat(cap) || 0)
    onChange({ storageCapacity:effCap, pressure:pres, params:pars, areaFactorOverride:aFactors })
  }
  const handlePressure   = pres => { const preset = mkTankParams(pres); setPressure(pres); setParams(preset); push(capacity, pres, preset) }
  const handleParam      = (key, val) => { const next = { ...params, [key]:{ ...params[key], value:parseFloat(val)||0 } }; setParams(next); push(capacity, pressure, next) }
  const handleFactorEdit = (bar, raw) => { const next = { ...areaFactorOverride, [bar]: parseFloat(raw) || 0 }; setAreaFactorOverride(next); push(capacity, pressure, params, next) }

  const openRowCtx = (e, key) => {
    e.preventDefault(); e.stopPropagation()
    const s = TANK_PARAM_SCHEMA[key]
    setRowCtxMenu({
      x:e.clientX, y:e.clientY, schema:s, canReset:true,
      onReset:() => {
        const next = { ...params, [key]:{ ...params[key], value:TANK_PRESETS[pressure][key] } }
        setParams(next); push(capacity, pressure, next)
      }
    })
  }

  const renderParamRow = key => {
    const s = TANK_PARAM_SCHEMA[key]
    return (
      <div key={key} onContextMenu={e => openRowCtx(e, key)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:'1px solid #0d1117', cursor:'context-menu' }}>
        <span style={{ flex:1, fontSize:13, color:'#94A3B8', minWidth:0 }}>{s.label}</span>
        <input type="number" step="any" value={params[key].value}
          onChange={e => handleParam(key, e.target.value)} onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}
          style={{ width:86, textAlign:'right', flexShrink:0, background:'#1E293B', border:'1px solid #334155', borderRadius:4, padding:'5px 22px 5px 7px', color:'#E2E8F0', fontSize:13, outline:'none', fontFamily:'monospace' }} />
        <div style={{ background:'#0a0f1a', border:'1px solid #1E293B', borderRadius:4, padding:'5px 7px', color:'#374151', fontSize:10, whiteSpace:'nowrap', flexShrink:0 }}>{s.unit}</div>
      </div>
    )
  }

  const ctx = rowCtxMenu && <RowContextMenu {...rowCtxMenu} onInfo={() => setInfoPopup({ x:rowCtxMenu.x, y:rowCtxMenu.y, schema:rowCtxMenu.schema })} onClose={() => setRowCtxMenu(null)} />
  const inf = infoPopup  && <InfoPopup {...infoPopup} onClose={() => setInfoPopup(null)} />

  // ── Tab: Input ──────────────────────────────────────────────────
  if (tab === 'input') return (
    <>
      <div>
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>Storage Pressure</div>
        <div style={{ display:'flex', gap:6 }}>
          {['350', '700'].map(p => (
            <button key={p} onClick={() => handlePressure(p)}
              style={{ flex:1, padding:'9px 0', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer', background: pressure===p ? '#064e3b' : '#0a0f1a', border:`1.5px solid ${pressure===p ? '#10B981' : '#334155'}`, color: pressure===p ? '#34D399' : '#475569' }}>
              {p} bar
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>Hydrogen Storage Capacity</div>
        {isAuto ? (
          <div style={{ background:'#0a1f14', border:'1px solid #134e2a', borderRadius:6, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, color:'#34D399', fontFamily:'monospace', fontWeight:700 }}>{fmtNum(upstreamH2Rate)}</span>
            <span style={{ fontSize:11, color:'#475569' }}>kg/h</span>
            <span style={{ marginLeft:'auto', fontSize:10, color:'#10B981', fontWeight:700, background:'#052e16', padding:'2px 8px', borderRadius:10 }}>🔗 업스트림 연결됨</span>
          </div>
        ) : (
          <div style={{ display:'flex', gap:6 }}>
            <input type="number" step="any" min="0" value={capacity} placeholder="0"
              onChange={e => { setCapacity(e.target.value); push(e.target.value, pressure, params) }}
              style={{ flex:1, background:'#1E293B', border:'1px solid #10B981', borderRadius:6, padding:'10px 12px', color:'#E2E8F0', fontSize:15, outline:'none', fontFamily:'monospace' }} />
            <div style={{ background:'#0a0f1a', border:'1px solid #1E293B', borderRadius:6, padding:'10px 13px', color:'#475569', fontSize:13, display:'flex', alignItems:'center' }}>kg/h</div>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>계산 결과</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          <ResultRow label="Internal Tank Volume" value={results.internalVolume} unit="L" color="#34D399" />
          <ResultRow label="System Volume"         value={results.systemVolume}   unit="L" color="#34D399" />
          <ResultRow label="Tank Weight"           value={results.tankWeight}     unit="kg" color="#60A5FA" />
        </div>
        {!effectiveCap && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'5px 0 0' }}>용량을 입력하면 결과가 계산됩니다</p>}
      </div>
      {ctx}{inf}
    </>
  )

  // ── Tab: Performance ────────────────────────────────────────────
  if (tab === 'performance') return (
    <>
      <div>
        <div style={{ fontSize:11, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>Tank Parameters</div>
        <div style={{ fontSize:11, color:'#374151', marginBottom:8, fontStyle:'italic' }}>우클릭 → 기본값 초기화 / 설명 보기</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          {TANK_PERF_KEYS.map(k => renderParamRow(k))}
        </div>
      </div>
      {ctx}{inf}
    </>
  )

  // ── Tab: Economic ───────────────────────────────────────────────
  if (tab === 'economic') return (
    <>
      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>Cost Parameter</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          {renderParamRow('specificTankCost')}
        </div>
      </div>
      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>계산 결과</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          <ResultRow label="Tank Cost" value={results.tankCost} unit="$" color="#F59E0B" large />
        </div>
        {!effectiveCap && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'5px 0 0' }}>용량을 입력해야 비용이 계산됩니다</p>}
      </div>
      {ctx}{inf}
    </>
  )

  // ── Tab: Dummy ─────────────────────────────────────────────────
  const areaFactor   = areaFactorOverride[pressure] ?? TANK_AREA_FACTOR[pressure]
  const tankTotalArea = effectiveCap > 0 ? +(effectiveCap * areaFactor).toFixed(1) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background:'#080E1A', border:'1px solid #334155', borderRadius:6, padding:'10px 14px' }}>
        <p style={{ fontSize:11, color:'#475569', margin:0, lineHeight:1.7 }}>
          ⚠ 아래 값들은 <strong style={{ color:'#F59E0B' }}>계산을 위해 사용하는 Dummy 값</strong>입니다.<br/>
          직접 수정 가능하며, 실제 설계 시 기자재 사양에 따라 별도 검토가 필요합니다.
        </p>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>저장 압력별 면적 계수 (Dummy)</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          {[['350', TANK_AREA_FACTOR['350']], ['700', TANK_AREA_FACTOR['700']]].map(([bar]) => {
            const isSelected = pressure === bar
            const factorVal  = areaFactorOverride[bar] ?? TANK_AREA_FACTOR[bar]
            return (
              <div key={bar} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderBottom:'1px solid #0d1117', background: isSelected ? '#0a1f14' : 'transparent' }}>
                <span style={{ fontSize:13, color: isSelected ? '#34D399' : '#94A3B8', fontWeight: isSelected ? 700 : 400, minWidth:56, flexShrink:0 }}>{bar} bar</span>
                <span style={{ flex:1, fontSize:11, color:'#475569' }}>면적 계수</span>
                <input
                  type="number" step="0.001" min="0" value={factorVal}
                  onChange={e => handleFactorEdit(bar, e.target.value)}
                  style={{ width:80, textAlign:'right', background: isSelected ? '#0d2a1a' : '#1E293B', border:`1px solid ${isSelected ? '#10B981' : '#334155'}`, borderRadius:4, padding:'4px 22px 4px 7px', color: isSelected ? '#F59E0B' : '#94A3B8', fontSize:13, outline:'none', fontFamily:'monospace' }}
                />
                <span style={{ fontSize:11, color:'#374151', flexShrink:0 }}>m²/kg-H₂</span>
                {isSelected && <span style={{ fontSize:9, color:'#10B981', fontWeight:700, background:'#052e16', padding:'2px 6px', borderRadius:8, flexShrink:0 }}>선택됨</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, color:'#34D399', fontWeight:700, letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>면적 계산 결과</div>
        <div style={{ background:'#080E1A', border:'1px solid #1E293B', borderRadius:6, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid #0d1117' }}>
            <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>저장 수소량</span>
            <span style={{ fontSize:14, color: effectiveCap > 0 ? '#94A3B8' : '#374151', fontFamily:'monospace', fontWeight:700 }}>{effectiveCap > 0 ? fmtNum(effectiveCap) : '—'}</span>
            <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>kg-H₂</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid #0d1117' }}>
            <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>면적 계수</span>
            <span style={{ fontSize:14, color:'#94A3B8', fontFamily:'monospace', fontWeight:700 }}>{areaFactor}</span>
            <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>m²/kg-H₂</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px' }}>
            <span style={{ flex:1, fontSize:13, color:'#6B7280' }}>총 설치 면적</span>
            <span style={{ fontSize:15, color: tankTotalArea ? '#34D399' : '#374151', fontFamily:'monospace', fontWeight:800 }}>{tankTotalArea != null ? fmtNum(tankTotalArea) : '—'}</span>
            <span style={{ fontSize:11, color:'#374151', marginLeft:4 }}>m²</span>
          </div>
        </div>
        {!effectiveCap && <p style={{ fontSize:11, color:'#374151', fontStyle:'italic', margin:'5px 0 0' }}>Input 탭에서 저장 용량을 입력하면 면적이 계산됩니다</p>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  NODE MODAL  — floating, non-blocking, draggable, tabbed
// ════════════════════════════════════════════════════════════════════
const TABS = [
  { key:'input',       label:'Input' },
  { key:'performance', label:'Performance' },
  { key:'economic',    label:'Economic' },
  { key:'dummy',       label:'Dummy' },
]

export default function NodeModal({ node, onClose, onApply }) {
  const [label,      setLabel]      = useState(node.data?.label ?? '')
  const [activeTab,  setActiveTab]  = useState('input')
  const [h2Params,   setH2Params]   = useState(() => node.data?.h2Params   ?? null)
  const [tankParams, setTankParams] = useState(() => node.data?.tankParams  ?? null)
  const [showHelp,   setShowHelp]   = useState(false)

  // Draggable position + resizable size
  const [size, setSize] = useState({ w: 460, h: 560 })
  const [pos, setPos]   = useState(() => ({ x: Math.max(0, (window.innerWidth - 460) / 2), y: 65 }))
  const isDragging  = useRef(false)
  const dragStart   = useRef({ x:0, y:0, px:0, py:0 })
  const isResizing  = useRef(false)
  const resizeDir   = useRef('')
  const resizeStart = useRef({ mx:0, my:0, w:0, h:0 })

  const onHeaderMouseDown = e => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return
    isDragging.current = true
    dragStart.current  = { x:e.clientX, y:e.clientY, px:pos.x, py:pos.y }
  }

  const onResizeMouseDown = (e, dir) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current  = true
    resizeDir.current   = dir
    resizeStart.current = { mx:e.clientX, my:e.clientY, w:size.w, h:size.h }
  }

  useEffect(() => {
    const onMove = e => {
      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.mx
        const dy = e.clientY - resizeStart.current.my
        const dir = resizeDir.current
        const newW = (dir==='e'||dir==='se') ? Math.max(360, resizeStart.current.w + dx) : undefined
        const newH = (dir==='s'||dir==='se') ? Math.max(300, resizeStart.current.h + dy) : undefined
        setSize(s => ({ w: newW ?? s.w, h: newH ?? s.h }))
        return
      }
      if (!isDragging.current) return
      setPos({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: Math.max(0, dragStart.current.py + e.clientY - dragStart.current.y) })
    }
    const onUp = () => { isDragging.current = false; isResizing.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [])

  // Reset when a different node is opened
  useEffect(() => {
    setLabel(node.data?.label ?? '')
    setH2Params(node.data?.h2Params   ?? null)
    setTankParams(node.data?.tankParams ?? null)
    setActiveTab('input')
  }, [node.id])

  const meta = TYPE_META[node.type] ?? { label:node.type, color:'#3B82F6' }

  // DOE live check
  const doeOk =
    node.type === 'hydrogenProduction'
      ? !!(h2Params?.h2Rate > 0 && h2Params?.power > 0)
    : node.type === 'storageTank'
      ? !!(tankParams?.storageCapacity > 0 && tankParams?.params &&
           ['specificInternalSize','specificSystemSize','specificTankWeight','specificTankCost'].every(k => tankParams.params[k]?.value > 0))
    : null
  const doeColor = doeOk === true ? '#3B82F6' : doeOk === false ? '#EF4444' : meta.color

  const handleApply = () => {
    const changes = { label }
    if (node.type === 'hydrogenProduction' && h2Params) {
      changes.h2Params = h2Params
      changes.specs    = { ...node.data?.specs, flowRate: h2Params.h2Rate }
    }
    if (node.type === 'storageTank' && tankParams) {
      changes.tankParams = tankParams
    }
    onApply(node.id, changes)
    onClose()
  }

  const upstreamH2Rate = parseFloat(node.data?.specs?.flowRate) || 0
  const HAS_CUSTOM = ['hydrogenProduction', 'storageTank']

  const helpDoc   = node.type === 'storageTank' ? getTankDocHTML() : getH2DocHTML()
  const helpTitle = node.type === 'storageTank' ? 'Storage Tank — 기술 문서' : 'H₂ Production — 기술 문서'
  const showHelpBtn = HAS_CUSTOM.includes(node.type)

  return (
    <>
      {/* Floating panel — no backdrop */}
      <div
        style={{
          position:'fixed', left:pos.x, top:pos.y,
          width:size.w, height:size.h,
          minWidth:360, minHeight:300,
          maxWidth:'calc(100vw - 40px)', maxHeight:'calc(100vh - 40px)',
          background:'#0D1929', border:'1px solid #1E3A5F',
          borderRadius:10, boxShadow:'0 20px 60px rgba(0,0,0,.85)',
          display:'flex', flexDirection:'column', zIndex:9100,
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Resize handles ── */}
        <div style={{ position:'absolute', top:0, right:0, width:4, height:'100%', cursor:'ew-resize', zIndex:9200 }} onMouseDown={e => onResizeMouseDown(e,'e')} />
        <div style={{ position:'absolute', bottom:0, left:0, height:4, width:'100%', cursor:'s-resize', zIndex:9200 }} onMouseDown={e => onResizeMouseDown(e,'s')} />
        <div style={{ position:'absolute', bottom:0, right:0, width:18, height:18, cursor:'se-resize', zIndex:9201, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:'2px 3px' }}
          onMouseDown={e => onResizeMouseDown(e,'se')}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents:'none', opacity:0.35 }}>
            <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* ── Header (drag handle) ── */}
        <div onMouseDown={onHeaderMouseDown}
          style={{ padding:'12px 16px', background:'#0A0F1A', borderBottom:'1px solid #1E293B', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, cursor:'grab', userSelect:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', background:`${doeColor}18`, border:`1px solid ${doeColor}44`, borderRadius:20, fontSize:11, fontWeight:600, color:doeColor }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:doeColor, display:'inline-block' }} />
              {meta.label}
            </span>
            <span style={{ fontSize:12, color:'#334155' }}>/ Setup</span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {showHelpBtn && (
              <button onClick={() => setShowHelp(true)}
                style={{ width:26, height:26, borderRadius:'50%', background:'#1E293B', border:'1px solid #334155', color:'#64748B', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}
                onMouseEnter={e => e.currentTarget.style.color='#93C5FD'} onMouseLeave={e => e.currentTarget.style.color='#64748B'}>?</button>
            )}
            <button onClick={onClose}
              style={{ width:26, height:26, background:'none', border:'1px solid #334155', borderRadius:5, color:'#94a3b8', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}
              onMouseEnter={e => e.currentTarget.style.color='#e2e8f0'} onMouseLeave={e => e.currentTarget.style.color='#94a3b8'}>×</button>
          </div>
        </div>

        {/* ── Label field ── */}
        <div style={{ padding:'12px 16px 0', flexShrink:0 }}>
          <div style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Label</div>
          <input value={label} onChange={e => setLabel(e.target.value)}
            style={{ width:'100%', background:'#0A0F1A', border:'1px solid #334155', borderRadius:6, padding:'8px 12px', color:'#E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor='#3B82F6'} onBlur={e => e.currentTarget.style.borderColor='#334155'} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', borderBottom:'1px solid #1E293B', margin:'12px 16px 0', flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'8px 20px', background:'transparent', border:'none', borderBottom:`2px solid ${activeTab===t.key ? '#3B82F6' : 'transparent'}`, color: activeTab===t.key ? '#60A5FA' : '#475569', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body (scrollable) ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:16 }}>
          {node.type === 'hydrogenProduction' && (
            <H2Params initData={node.data?.h2Params} onChange={setH2Params} tab={activeTab} />
          )}
          {node.type === 'storageTank' && (
            <StorageTankParams initData={node.data?.tankParams} onChange={setTankParams} upstreamH2Rate={upstreamH2Rate} tab={activeTab} />
          )}
          {!HAS_CUSTOM.includes(node.type) && (
            <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:'32px 16px' }}>
              파라미터 설정이 준비 중입니다.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #1E293B', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:'8px 20px', background:'transparent', border:'1px solid #334155', borderRadius:6, color:'#64748B', fontSize:13, cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#475569'} onMouseLeave={e => e.currentTarget.style.borderColor='#334155'}>
            Cancel
          </button>
          <button onClick={handleApply}
            style={{ padding:'8px 24px', background:'#2563EB', border:'none', borderRadius:6, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
            Apply
          </button>
        </div>
      </div>

      {showHelp && <HelpModal docHTML={helpDoc} title={helpTitle} onClose={() => setShowHelp(false)} />}
    </>
  )
}
