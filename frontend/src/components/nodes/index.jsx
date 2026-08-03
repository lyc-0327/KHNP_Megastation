import HydrogenProductionNode from './HydrogenProductionNode'
import StorageTankNode from './StorageTankNode'
import CompressorNode from './CompressorNode'
import PipelineNode from './PipelineNode'
import TruckNode from './TruckNode'
import DemandNode from './DemandNode'

export const nodeTypes = {
  hydrogenProduction: HydrogenProductionNode,
  storageTank: StorageTankNode,
  compressor: CompressorNode,
  pipeline: PipelineNode,
  truck: TruckNode,
  demandNode: DemandNode,
}

export const paletteItems = [
  {
    type: 'hydrogenProduction',
    label: 'H₂ Production',
    color: '#3B82F6',
    bg: '#DBEAFE',
    icon: (
      /* PEM electrolyzer stack — stacked cells with H₂ output */
      <svg width="50" height="32" viewBox="0 0 52 34" fill="none">
        <rect x="2" y="4" width="48" height="26" rx="2.5" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5"/>
        {[13, 22, 31, 40].map(x => (
          <line key={x} x1={x} y1="4" x2={x} y2="30" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.45"/>
        ))}
        {/* anode / cathode indicator bars */}
        <rect x="2" y="4" width="5" height="26" rx="1" fill="#3B82F6" opacity="0.25"/>
        <rect x="45" y="4" width="5" height="26" rx="1" fill="#60A5FA" opacity="0.25"/>
        {/* H₂ label */}
        <text x="26" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1D4ED8" fontFamily="system-ui">H₂</text>
      </svg>
    ),
  },
  {
    type: 'storageTank',
    label: 'Storage Tank',
    color: '#10B981',
    bg: '#D1FAE5',
    icon: (
      /* Vertical pressure vessel (CGH₂) */
      <svg width="28" height="46" viewBox="0 0 28 50" fill="none">
        {/* dome top */}
        <path d="M4 16 Q4 4 14 4 Q24 4 24 16" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round"/>
        {/* cylinder body */}
        <rect x="4" y="16" width="20" height="22" fill="#D1FAE5"/>
        <line x1="4"  y1="16" x2="4"  y2="38" stroke="#10B981" strokeWidth="1.5"/>
        <line x1="24" y1="16" x2="24" y2="38" stroke="#10B981" strokeWidth="1.5"/>
        {/* flat bottom */}
        <ellipse cx="14" cy="38" rx="10" ry="3" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5"/>
        {/* gas level line */}
        <line x1="5" y1="29" x2="23" y2="29" stroke="#10B981" strokeWidth="1.1" strokeDasharray="3.5,2.5" strokeOpacity="0.55"/>
        {/* valve stem */}
        <line x1="14" y1="4"  x2="14" y2="1"  stroke="#10B981" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="10" y1="1"  x2="18" y2="1"  stroke="#10B981" strokeWidth="2"   strokeLinecap="round"/>
        {/* support legs */}
        <line x1="7"  y1="41" x2="5"  y2="47" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
        <line x1="21" y1="41" x2="23" y2="47" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
      </svg>
    ),
  },
  {
    type: 'compressor',
    label: 'Compressor',
    color: '#F59E0B',
    bg: '#FEF3C7',
    icon: (
      /* Centrifugal compressor — circle with converging flow arrows */
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="17" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
        {/* impeller blades */}
        {[0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg * Math.PI) / 180
          const x1 = 20 + 6 * Math.cos(rad)
          const y1 = 20 + 6 * Math.sin(rad)
          const x2 = 20 + 14 * Math.cos(rad + 0.5)
          const y2 = 20 + 14 * Math.sin(rad + 0.5)
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        })}
        <circle cx="20" cy="20" r="4.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.3"/>
        {/* inlet arrow */}
        <line x1="3" y1="20" x2="9" y2="20" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        <polyline points="7,17.5 9.5,20 7,22.5" fill="none" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: 'pipeline',
    label: 'Pipeline',
    color: '#64748B',
    bg: '#F1F5F9',
    icon: (
      /* Underground pipe cross-section with flow arrow */
      <svg width="52" height="22" viewBox="0 0 60 24" fill="none">
        {/* outer pipe */}
        <rect x="1" y="5" width="58" height="14" rx="7" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5"/>
        {/* inner bore */}
        <rect x="7" y="9" width="46" height="6" rx="3" fill="#CBD5E1" stroke="none"/>
        {/* flow arrow */}
        <line x1="16" y1="12" x2="36" y2="12" stroke="#64748B" strokeWidth="1.5"/>
        <polyline points="33,9.5 36.5,12 33,14.5" fill="none" stroke="#64748B" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: 'truck',
    label: 'Truck Transport',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    icon: (
      /* Hydrogen tube trailer truck */
      <svg width="52" height="34" viewBox="0 0 60 38" fill="none">
        {/* trailer */}
        <rect x="1" y="5" width="38" height="20" rx="2" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
        {/* H₂ cylinder on trailer */}
        <rect x="5" y="9" width="30" height="12" rx="6" fill="#C4B5FD" stroke="#8B5CF6" strokeWidth="1" strokeOpacity="0.7"/>
        <text x="20" y="19" textAnchor="middle" fontSize="7" fontWeight="700" fill="#5B21B6" fontFamily="system-ui">H₂</text>
        {/* cab */}
        <rect x="39" y="10" width="19" height="15" rx="2" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
        <rect x="42" y="12" width="12" height="9" rx="1" fill="#C4B5FD" opacity="0.85"/>
        {/* wheels */}
        <circle cx="10"  cy="29" r="4.5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
        <circle cx="28"  cy="29" r="4.5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
        <circle cx="50"  cy="29" r="4.5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    type: 'demandNode',
    label: 'Demand Node',
    color: '#EF4444',
    bg: '#FEE2E2',
    icon: (
      /* Consumer / demand sink — building with downward arrow */
      <svg width="36" height="38" viewBox="0 0 38 42" fill="none">
        {/* building */}
        <rect x="6" y="16" width="26" height="22" rx="1.5" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5"/>
        {/* roof */}
        <polyline points="3,16 19,4 35,16" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round"/>
        {/* door */}
        <rect x="15" y="27" width="8" height="11" rx="1" fill="#FCA5A5" stroke="#EF4444" strokeWidth="1"/>
        {/* windows */}
        <rect x="9"  y="21" width="6" height="5" rx="0.5" fill="#FCA5A5" stroke="#EF4444" strokeWidth="1"/>
        <rect x="23" y="21" width="6" height="5" rx="0.5" fill="#FCA5A5" stroke="#EF4444" strokeWidth="1"/>
      </svg>
    ),
  },
]
