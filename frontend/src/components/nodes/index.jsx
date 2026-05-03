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
      <svg width="44" height="28" viewBox="0 0 54 34">
        <rect x="1" y="1" width="52" height="32" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
        {[12, 22, 32, 42].map((x) => (
          <line key={x} x1={x} y1="3" x2={x} y2="31" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.5" />
        ))}
        <text x="27" y="22" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1D4ED8" fontFamily="system-ui">H₂</text>
      </svg>
    ),
  },
  {
    type: 'storageTank',
    label: 'Storage Tank',
    color: '#10B981',
    bg: '#D1FAE5',
    icon: (
      <svg width="48" height="26" viewBox="0 0 60 32">
        <rect x="10" y="2" width="40" height="28" fill="#D1FAE5" />
        <line x1="10" y1="2" x2="50" y2="2" stroke="#10B981" strokeWidth="1.5" />
        <line x1="10" y1="30" x2="50" y2="30" stroke="#10B981" strokeWidth="1.5" />
        <ellipse cx="10" cy="16" rx="8" ry="14" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
        <ellipse cx="50" cy="16" rx="8" ry="14" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
        <line x1="12" y1="22" x2="48" y2="22" stroke="#10B981" strokeWidth="1" strokeDasharray="4,2" strokeOpacity="0.6" />
      </svg>
    ),
  },
  {
    type: 'compressor',
    label: 'Compressor',
    color: '#F59E0B',
    bg: '#FEF3C7',
    icon: (
      <svg width="34" height="34" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <polygon points="7,11 7,29 33,20" fill="#F59E0B" opacity="0.65" />
      </svg>
    ),
  },
  {
    type: 'pipeline',
    label: 'Pipeline',
    color: '#64748B',
    bg: '#F1F5F9',
    icon: (
      <svg width="52" height="18" viewBox="0 0 70 22">
        <rect x="1" y="6" width="68" height="10" rx="5" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
        <line x1="22" y1="11" x2="42" y2="11" stroke="#64748B" strokeWidth="1.5" />
        <polygon points="42,8 42,14 50,11" fill="#64748B" />
      </svg>
    ),
  },
  {
    type: 'truck',
    label: 'Truck Transport',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    icon: (
      <svg width="50" height="32" viewBox="0 0 62 38">
        <rect x="1" y="4" width="36" height="18" rx="2" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
        <rect x="37" y="8" width="22" height="14" rx="2" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
        <rect x="41" y="10" width="14" height="9" rx="1" fill="#C4B5FD" opacity="0.9" />
        <circle cx="12" cy="27" r="5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
        <circle cx="28" cy="27" r="5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
        <circle cx="51" cy="27" r="5" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: 'demandNode',
    label: 'Demand Node',
    color: '#EF4444',
    bg: '#FEE2E2',
    icon: (
      <svg width="32" height="32" viewBox="0 0 38 38">
        <polygon points="19,2 36,19 19,36 2,19" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
        <circle cx="19" cy="19" r="6" fill="#EF4444" opacity="0.45" />
      </svg>
    ),
  },
]
