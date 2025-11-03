'use client'

import { useEffect, useRef, useState } from 'react'

interface Node {
  id: string
  x: number
  y: number
  text: string
  color: string
  connections: string[]
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']

export default function MindMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', x: 400, y: 300, text: 'Central Idea', color: '#8b5cf6', connections: [] }
  ])
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isPanning, setIsPanning] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    // Draw connections
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId)
        if (target) {
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
      })
    })

    // Draw nodes
    nodes.forEach(node => {
      // Outer glow
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 80)
      gradient.addColorStop(0, node.color + '40')
      gradient.addColorStop(1, node.color + '00')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(node.x, node.y, 80, 0, Math.PI * 2)
      ctx.fill()

      // Node circle
      ctx.fillStyle = node.color
      ctx.shadowColor = node.color
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.arc(node.x, node.y, 50, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Border
      ctx.strokeStyle = node.color + 'aa'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const maxWidth = 90
      const words = node.text.split(' ')
      let lines: string[] = []
      let currentLine = ''

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })
      lines.push(currentLine)

      const lineHeight = 16
      const totalHeight = lines.length * lineHeight
      const startY = node.y - totalHeight / 2 + lineHeight / 2

      lines.forEach((line, i) => {
        ctx.fillText(line, node.x, startY + i * lineHeight)
      })
    })

    ctx.restore()
  }, [nodes, offset, scale])

  const getNodeAtPosition = (x: number, y: number) => {
    const adjustedX = (x - offset.x) / scale
    const adjustedY = (y - offset.y) / scale

    return nodes.find(node => {
      const dx = node.x - adjustedX
      const dy = node.y - adjustedY
      return Math.sqrt(dx * dx + dy * dy) < 50
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const node = getNodeAtPosition(x, y)

    if (e.shiftKey && node) {
      setConnectingFrom(node.id)
      return
    }

    if (node) {
      setDraggedNode(node.id)
      setDragStart({ x: x / scale - offset.x / scale, y: y / scale - offset.y / scale })
      setIsDragging(true)
    } else {
      setIsPanning(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left) / scale - offset.x / scale
      const y = (e.clientY - rect.top) / scale - offset.y / scale

      setNodes(nodes.map(node =>
        node.id === draggedNode
          ? { ...node, x, y }
          : node
      ))
    } else if (isPanning) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (connectingFrom) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const targetNode = getNodeAtPosition(x, y)

      if (targetNode && targetNode.id !== connectingFrom) {
        setNodes(nodes.map(node =>
          node.id === connectingFrom
            ? { ...node, connections: [...node.connections, targetNode.id] }
            : node
        ))
      }
      setConnectingFrom(null)
    }

    setIsDragging(false)
    setDraggedNode(null)
    setIsPanning(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const node = getNodeAtPosition(x, y)

    if (node) {
      setEditingNode(node.id)
      setEditText(node.text)
    } else {
      const adjustedX = (x - offset.x) / scale
      const adjustedY = (y - offset.y) / scale

      const newNode: Node = {
        id: Date.now().toString(),
        x: adjustedX,
        y: adjustedY,
        text: 'New Idea',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        connections: []
      }
      setNodes([...nodes, newNode])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingNode) {
      setNodes(nodes.map(node =>
        node.id === editingNode
          ? { ...node, text: editText || 'Empty' }
          : node
      ))
      setEditingNode(null)
      setEditText('')
    } else if (e.key === 'Escape') {
      setEditingNode(null)
      setEditText('')
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.5, scale + delta), 2)
    setScale(newScale)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab' }}
      />

      {editingNode && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a1a',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #8b5cf6',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
        }}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '12px',
              color: '#e0e0e0',
              fontSize: '16px',
              width: '300px',
              outline: 'none'
            }}
          />
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            Press Enter to save, Esc to cancel
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(26, 26, 26, 0.9)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #333',
        fontSize: '14px',
        color: '#888',
        maxWidth: '300px'
      }}>
        <div style={{ marginBottom: '8px', color: '#8b5cf6', fontWeight: 'bold' }}>Controls</div>
        <div>🖱️ Double-click: Add node</div>
        <div>🖱️ Double-click node: Edit text</div>
        <div>🖱️ Drag: Move nodes</div>
        <div>🖱️ Drag empty space: Pan</div>
        <div>⌨️ Shift + Click + Click: Connect nodes</div>
        <div>🖱️ Scroll: Zoom in/out</div>
      </div>
    </div>
  )
}
