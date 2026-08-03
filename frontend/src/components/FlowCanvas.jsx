import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes, paletteItems } from './nodes/index.jsx'
import { DEFAULT_SPECS } from './nodes/specs.js'
import PropertiesPanel from './PropertiesPanel.jsx'
import ContextMenu from './ContextMenu.jsx'
import NodeModal from './NodeModal.jsx'

// ── Area constants ─────────────────────────────────────────────────────

const UNIT_AREA        = { 1:100, 2:200, 5:500, 10:1000, 100:10000 }
const TANK_AREA_FACTOR = { '350': 0.05, '700': 0.04 }

function computeTotalArea(nodes) {
  let total = 0
  for (const n of nodes) {
    if (n.type === 'hydrogenProduction') {
      const h2      = n.data?.h2Params
      const unitMW  = h2?.unitMW
      const power   = h2?.power ?? 0
      const uArea   = h2?.unitAreaOverride ?? UNIT_AREA
      if (unitMW && power > 0) {
        total += Math.ceil(power / (unitMW * 1000)) * (uArea[unitMW] ?? UNIT_AREA[unitMW])
      }
    } else if (n.type === 'storageTank') {
      const tank    = n.data?.tankParams
      const cap     = parseFloat(tank?.storageCapacity) || 0
      const pres    = tank?.pressure ?? '350'
      const aFactor = tank?.areaFactorOverride ?? TANK_AREA_FACTOR
      if (cap > 0) total += cap * (aFactor[pres] ?? TANK_AREA_FACTOR[pres])
    }
  }
  return total
}

// ── Edge appearance ────────────────────────────────────────────────────

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#475569', strokeWidth: 1.8 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#475569' },
}

// ── Stream propagation ─────────────────────────────────────────────────

function computeCascade(startId, nodes, edges) {
  const map = Object.fromEntries(nodes.map(n => [n.id, n]))

  const visited = new Set([startId])
  const queue   = [startId]

  while (queue.length > 0) {
    const curId = queue.shift()
    const cur   = map[curId]
    if (!cur) continue

    const flowRate    = parseFloat(cur.data?.specs?.flowRate)    || 0
    const pressure    = parseFloat(cur.data?.specs?.pressure)    || 0
    const temperature = parseFloat(cur.data?.specs?.temperature) || 0

    for (const edge of edges) {
      if (edge.source !== curId) continue
      const tid = edge.target
      if (visited.has(tid)) continue
      visited.add(tid)

      const tgt = map[tid]
      if (!tgt) continue

      const specs = { ...(tgt.data?.specs ?? {}) }
      if (flowRate    > 0) specs.flowRate    = String(flowRate)
      if (temperature > 0) specs.temperature = String(temperature)
      if (pressure > 0 && tgt.type !== 'compressor') specs.pressure = String(pressure)

      map[tid] = { ...tgt, data: { ...tgt.data, specs } }
      queue.push(tid)
    }
  }

  return nodes.map(n => map[n.id] ?? n)
}

// ── ID counter ─────────────────────────────────────────────────────────

let counter = 0

// ── Export Modal ───────────────────────────────────────────────────────

function ExportModal({ nodes, edges, totalArea, onClose }) {
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('khnp_projects') || '[]') }
    catch { return [] }
  })
  const [search,          setSearch]          = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [flowName,        setFlowName]        = useState('')
  const [flowDesc,        setFlowDesc]        = useState('')
  const [done,            setDone]            = useState(false)

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects

  const canExport = selectedProject && flowName.trim()

  const handleExport = () => {
    if (!canExport) return
    const flow = {
      id: Date.now().toString(),
      name: flowName.trim(),
      description: flowDesc.trim(),
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
      totalArea,
    }
    const all = JSON.parse(localStorage.getItem('khnp_projects') || '[]')
    const updated = all.map(p =>
      p.id === selectedProject.id
        ? { ...p, flows: [...(p.flows || []), flow] }
        : p
    )
    localStorage.setItem('khnp_projects', JSON.stringify(updated))
    setDone(true)
    setTimeout(onClose, 1400)
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#161b22', border:'1px solid #2ea043', borderRadius:10, padding:'32px 40px', textAlign:'center' }}>
        <div style={{ color:'#3fb950', fontSize:32, marginBottom:10 }}>✓</div>
        <p style={{ color:'#c9d1d9', fontSize:14, fontWeight:600, margin:0 }}>공정이 저장되었습니다</p>
        <p style={{ color:'#8b949e', fontSize:11, margin:'6px 0 0' }}>{selectedProject.name}에 추가됨</p>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#161b22', border:'1px solid #30363d', borderRadius:10,
        padding:24, width:420, display:'flex', flexDirection:'column', gap:14,
        maxHeight:'85vh', overflow:'hidden',
      }}>
        <p style={{ color:'#4fc3f7', fontSize:13, fontWeight:700, margin:0 }}>공정 내보내기</p>

        {/* Flow name */}
        <div>
          <label style={{ color:'#8b949e', fontSize:10, fontWeight:700, letterSpacing:0.8, display:'block', marginBottom:4 }}>공정 이름 *</label>
          <input value={flowName} onChange={e => setFlowName(e.target.value)}
            placeholder="공정 이름을 입력하세요"
            style={{ width:'100%', boxSizing:'border-box', background:'#0d1117', border:`1px solid ${flowName ? '#1f6feb' : '#30363d'}`, borderRadius:5, padding:'7px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }} />
        </div>

        {/* Flow desc */}
        <div>
          <label style={{ color:'#8b949e', fontSize:10, fontWeight:700, letterSpacing:0.8, display:'block', marginBottom:4 }}>공정 설명</label>
          <textarea value={flowDesc} onChange={e => setFlowDesc(e.target.value)}
            placeholder="공정 설명 (선택)" rows={2}
            style={{ width:'100%', boxSizing:'border-box', resize:'none', background:'#0d1117', border:'1px solid #30363d', borderRadius:5, padding:'7px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }} />
        </div>

        {/* Stats */}
        <div style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:6, padding:'8px 12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8b949e' }}>
            <span>노드 수</span><span style={{ color:'#c9d1d9' }}>{nodes.length}개</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8b949e', marginTop:3 }}>
            <span>총 요구 면적</span>
            <span style={{ color: totalArea > 0 ? '#34D399' : '#8b949e' }}>
              {totalArea > 0 ? `${totalArea.toLocaleString('en-US')} m²` : '—'}
            </span>
          </div>
        </div>

        {/* Project search */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
          <label style={{ color:'#8b949e', fontSize:10, fontWeight:700, letterSpacing:0.8, display:'block', marginBottom:4 }}>저장할 프로젝트 *</label>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            style={{ width:'100%', boxSizing:'border-box', background:'#0d1117', border:'1px solid #30363d', borderRadius:5, padding:'6px 10px', color:'#c9d1d9', fontSize:11, outline:'none', marginBottom:6 }} />
          <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:3, maxHeight:180 }}>
            {filtered.length === 0 && (
              <p style={{ color:'#484f58', fontSize:11, margin:'12px 0', textAlign:'center' }}>
                {projects.length === 0 ? '저장된 프로젝트가 없습니다' : '검색 결과 없음'}
              </p>
            )}
            {filtered.map(p => (
              <div key={p.id} onClick={() => setSelectedProject(p)} style={{
                padding:'8px 10px', borderRadius:5, cursor:'pointer',
                background: selectedProject?.id === p.id ? '#1f3a5a' : '#0d1117',
                border: `1px solid ${selectedProject?.id === p.id ? '#1f6feb' : '#21262d'}`,
              }}>
                <div style={{ color:'#c9d1d9', fontSize:12, fontWeight:600 }}>{p.name}</div>
                {p.description && <div style={{ color:'#8b949e', fontSize:10, marginTop:2 }}>{p.description}</div>}
                {(p.flows?.length ?? 0) > 0 && (
                  <div style={{ color:'#484f58', fontSize:10, marginTop:2 }}>공정 {p.flows.length}개 첨부됨</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={handleExport} disabled={!canExport} style={{
            flex:1, padding:'8px 0', borderRadius:5, fontWeight:600, fontSize:12,
            cursor: canExport ? 'pointer' : 'not-allowed',
            background: canExport ? '#1f6feb' : '#21262d', border:'none',
            color: canExport ? '#fff' : '#484f58',
          }}>내보내기</button>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:5, fontSize:12, cursor:'pointer', background:'transparent', border:'1px solid #30363d', color:'#8b949e' }}>취소</button>
        </div>
      </div>
    </div>
  )
}

// ── Inner canvas ────────────────────────────────────────────────────────

function FlowCanvasInner({ isDark, onRegisterExport, onRegisterActions }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedId,      setSelectedId]      = useState(null)
  const [contextMenu,     setContextMenu]     = useState(null)
  const [modalNode,       setModalNode]       = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  useEffect(() => {
    onRegisterExport?.(() => setShowExportModal(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onRegisterActions) return
    onRegisterActions({
      getFlow: () => ({ nodes: nodesRef.current, edges: edgesRef.current }),
      loadFlow: (n, e) => { setNodes(n); setEdges(e) },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback((conn) => {
    setEdges(eds => addEdge(conn, eds))
    setNodes(nds => computeCascade(conn.source, nds, [...edges, conn]))
  }, [edges])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || !nodeTypes[type]) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const item = paletteItems.find(p => p.type === type)
    setNodes(nds => [...nds, {
      id: `${type}_${++counter}`,
      type,
      position,
      data: {
        label: item?.label ?? type,
        specs: { ...(DEFAULT_SPECS[type] ?? {}) },
        originalPosition: { ...position },
      },
    }])
  }, [screenToFlowPosition, setNodes])

  const onNodeClick       = useCallback((_, node) => setSelectedId(node.id), [])
  const onNodeDoubleClick = useCallback((_, node) => setModalNode(node), [])
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault()
    setContextMenu({ node, x: e.clientX, y: e.clientY })
  }, [])
  const onPaneContextMenu = useCallback((e) => e.preventDefault(), [])
  const onPaneClick = useCallback(() => {
    setSelectedId(null)
    setContextMenu(null)
  }, [])

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  const handleDelete = (id) => {
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setSelectedId(null)
  }

  const handleLabelChange = (id, label) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n))
  }

  const handleModalApply = useCallback((id, changes) => {
    setNodes(nds => {
      const updated = nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...changes } } : n)
      return computeCascade(id, updated, edges)
    })
  }, [edges])

  const handleResetPosition = useCallback((id) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n
      const orig = n.data?.originalPosition
      return orig ? { ...n, position: { ...orig } } : n
    }))
  }, [])

  const totalArea = computeTotalArea(nodes)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}
        onDrop={onDrop} onDragOver={onDragOver}>

        {/* Total area overlay */}
        <div style={{ position:'absolute', top:16, left:16, zIndex:10, background:'rgba(9,14,26,0.88)', border:'1px solid #1E3A5F', borderRadius:8, padding:'9px 14px', backdropFilter:'blur(6px)', pointerEvents:'none', minWidth:180 }}>
          <div style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:1.1, textTransform:'uppercase', marginBottom:4 }}>본 공정 총 요구 면적</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
            <span style={{ fontSize:18, fontWeight:800, color: totalArea > 0 ? '#34D399' : '#374151', fontFamily:'monospace' }}>
              {totalArea > 0 ? totalArea.toLocaleString('en-US') : '—'}
            </span>
            <span style={{ fontSize:12, color:'#475569' }}>m²</span>
          </div>
          {totalArea === 0 && <div style={{ fontSize:9, color:'#334155', fontStyle:'italic', marginTop:2 }}>노드를 설정하면 계산됩니다</div>}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          deleteKeyCode="Delete"
          nodesDraggable={true}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={onPaneClick}
          style={{ width: '100%', height: '100%' }}
        >
          <Background color={isDark ? '#2d3748' : '#9aa5b4'} gap={22} size={1.2} />
          <Controls style={{ bottom: 16, left: 16, top: 'auto' }} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <PropertiesPanel
          node={selectedNode}
          onClose={() => setSelectedId(null)}
          onDelete={handleDelete}
          onLabelChange={handleLabelChange}
        />
      )}

      {contextMenu && (
        <ContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onSetup={() => {
            const n = nodes.find(n => n.id === contextMenu.node.id)
            setModalNode(n ?? contextMenu.node)
          }}
          onResetPosition={handleResetPosition}
          onDelete={() => handleDelete(contextMenu.node.id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {modalNode && (
        <NodeModal
          node={nodes.find(n => n.id === modalNode.id) ?? modalNode}
          onClose={() => setModalNode(null)}
          onApply={handleModalApply}
        />
      )}

      {showExportModal && (
        <ExportModal
          nodes={nodes}
          edges={edges}
          totalArea={totalArea}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}

export default function FlowCanvas({ isDark, onRegisterExport, onRegisterActions }) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner isDark={isDark} onRegisterExport={onRegisterExport} onRegisterActions={onRegisterActions} />
    </ReactFlowProvider>
  )
}
