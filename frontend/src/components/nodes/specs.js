export const COMMON_SPECS = [
  { key: 'temperature', label: 'Temperature', unit: '°C'  },
  { key: 'pressure',    label: 'Pressure',    unit: 'MPa' },
  { key: 'flowRate',    label: 'Flow Rate',   unit: 'kg/h' },
]

export const DEVICE_SPECS = {
  hydrogenProduction: [
    { key: 'current',    label: 'Current',     unit: 'A'  },
    { key: 'voltage',    label: 'Voltage',     unit: 'V'  },
    { key: 'efficiency', label: 'Efficiency',  unit: '%'  },
    { key: 'stackCount', label: 'Stack Count', unit: 'ea' },
  ],
  storageTank: [
    { key: 'capacity',  label: 'Capacity',   unit: 'kg' },
    { key: 'fillLevel', label: 'Fill Level', unit: '%'  },
  ],
  compressor: [
    { key: 'powerInput',       label: 'Power Input',       unit: 'kW' },
    { key: 'compressionRatio', label: 'Compression Ratio', unit: '—'  },
  ],
  pipeline: [
    { key: 'length',   label: 'Length',   unit: 'km' },
    { key: 'diameter', label: 'Diameter', unit: 'mm' },
  ],
  truck: [
    { key: 'capacity',  label: 'Capacity',  unit: 'kg'      },
    { key: 'distance',  label: 'Distance',  unit: 'km'      },
    { key: 'frequency', label: 'Frequency', unit: 'trips/d' },
  ],
  demandNode: [
    { key: 'demandRate',    label: 'Demand Rate',    unit: 'kg/h' },
    { key: 'priorityLevel', label: 'Priority Level', unit: '1–5'  },
  ],
}

// 각 노드 타입에 대한 초기 빈 스펙 (공통 + 장치별)
export const DEFAULT_SPECS = Object.fromEntries(
  Object.entries(DEVICE_SPECS).map(([type, fields]) => [
    type,
    Object.fromEntries([
      ...COMMON_SPECS.map((f) => [f.key, '']),
      ...fields.map((f) => [f.key, '']),
    ]),
  ]),
)
