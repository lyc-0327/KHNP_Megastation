import { useCallback, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
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

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#94A3B8', strokeWidth: 2 },
}

let counter = 0

function FlowCanvasInner({ mode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedId, setSelectedId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { node, x, y }
  const [modalNode, setModalNode]     = useState(null)
  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (conn) => setEdges((eds) => addEdge(conn, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || !nodeTypes[type]) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const item = paletteItems.find((p) => p.type === type)
    setNodes((nds) => [...nds, {
      id: `${type}_${++counter}`,
      type,
      position,
      data: {
        label: item?.label ?? type,
        specs: { ...(DEFAULT_SPECS[type] ?? {}) },
      },
    }])
  }, [screenToFlowPosition, setNodes])

  const onNodeClick = useCallback((_, node) => setSelectedId(node.id), [])

  const onNodeDoubleClick = useCallback((_, node) => {
    setModalNode(node)
  }, [])

  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault()
    setContextMenu({ node, x: e.clientX, y: e.clientY })
  }, [])

  const onPaneContextMenu = useCallback((e) => e.preventDefault(), [])

  const onPaneClick = useCallback(() => {
    setSelectedId(null)
    setContextMenu(null)
  }, [])

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null

  const handleDelete = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedId(null)
  }

  const handleLabelChange = (id, label) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n))
  }

  const handleModalApply = (id, changes) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...changes } } : n))
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{ flex: 1 }}
        className={mode === 'connect' ? 'connect-mode' : ''}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
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
          nodesDraggable={mode === 'select'}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={onPaneClick}
          style={{ width: '100%', height: '100%' }}
        >
          <Background color="#CBD5E1" gap={22} size={1.2} />
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
            const n = nodes.find((n) => n.id === contextMenu.node.id)
            setModalNode(n ?? contextMenu.node)
          }}
          onDelete={() => handleDelete(contextMenu.node.id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {modalNode && (
        <NodeModal
          node={nodes.find((n) => n.id === modalNode.id) ?? modalNode}
          onClose={() => setModalNode(null)}
          onApply={handleModalApply}
        />
      )}
    </div>
  )
}

export default function FlowCanvas({ mode }) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner mode={mode} />
    </ReactFlowProvider>
  )
}
