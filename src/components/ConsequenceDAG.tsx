import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Info, Activity, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ConsequenceGraph, FutureBranch, GraphEdge, GraphNode } from '../types/index.ts';

interface ConsequenceDAGProps {
  graph: ConsequenceGraph;
  futureBranches: FutureBranch[];
  activeBranchId: FutureBranch['id'];
  onSelectBranch: (id: FutureBranch['id']) => void;
}

export const ConsequenceDAG: React.FC<ConsequenceDAGProps> = ({
  graph,
  futureBranches,
  activeBranchId,
  onSelectBranch,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Group nodes by layer (1 to 5)
  const layerColumns: Record<number, GraphNode[]> = {
    1: graph.nodes.filter((n) => n.layer === 1),
    2: graph.nodes.filter((n) => n.layer === 2),
    3: graph.nodes.filter((n) => n.layer === 3),
    4: graph.nodes.filter((n) => n.layer === 4),
    5: graph.nodes.filter((n) => n.layer === 5),
  };

  const layerTitles: Record<number, string> = {
    1: '1. Interventions',
    2: '2. Direct Mechanics',
    3: '3. Behavioral Shifts',
    4: '4. Compounding Cohort',
    5: '5. Terminal Outcomes',
  };

  // Node positions on a virtual canvas (width: 1040, height: 480)
  const columnX = [80, 290, 510, 730, 930];
  const nodePositions: Record<string, { x: number; y: number }> = {};

  [1, 2, 3, 4, 5].forEach((layerNum, colIdx) => {
    const nodesInCol = layerColumns[layerNum] || [];
    const count = nodesInCol.length;
    nodesInCol.forEach((node, rowIdx) => {
      const spacing = 400 / Math.max(1, count + 1);
      const y = 50 + (rowIdx + 1) * spacing;
      nodePositions[node.id] = { x: columnX[colIdx], y };
    });
  });

  const activeBranch = futureBranches.find((b) => b.id === activeBranchId) || futureBranches[1];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Top Controls & Branch Navigator Header */}
      <div className="h-12 px-6 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between z-10 shrink-0">
        {/* Branch Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          {futureBranches.map((branch) => {
            const isActive = branch.id === activeBranchId;
            return (
              <button
                key={branch.id}
                onClick={() => onSelectBranch(branch.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: branch.color }}
                />
                <span className="capitalize">{branch.id} Future ({branch.probabilityPct}%)</span>
              </button>
            );
          })}
        </div>

        {/* Zoom & Canvas Actions */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setZoomLevel((prev) => Math.min(1.4, prev + 0.1))}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.1))}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setSelectedNode(null);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive SVG DAG Viewport */}
      <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center">
        <div
          className="relative transition-transform duration-200 origin-center"
          style={{
            transform: `scale(${zoomLevel})`,
            width: '1060px',
            height: '470px',
          }}
        >
          {/* Layer Headers */}
          <div className="absolute top-2 left-0 right-0 grid grid-cols-5 text-center pointer-events-none px-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {layerTitles[num]}
              </div>
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <linearGradient id="edgeGradPositive" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edgeGradNegative" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edgeGradNeutral" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.6" />
              </linearGradient>

              {/* Marker Arrows */}
              <marker id="arrowPos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
              </marker>
              <marker id="arrowNeg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
              </marker>
              <marker id="arrowNeu" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Render Causal Edges */}
            {graph.edges.map((edge) => {
              const src = nodePositions[edge.source];
              const tgt = nodePositions[edge.target];
              if (!src || !tgt) return null;

              const isPos = edge.polarity === 'positive';
              const isNeg = edge.polarity === 'negative';
              const strokeColor = isPos ? 'url(#edgeGradPositive)' : isNeg ? 'url(#edgeGradNegative)' : 'url(#edgeGradNeutral)';
              const markerEnd = isPos ? 'url(#arrowPos)' : isNeg ? 'url(#arrowNeg)' : 'url(#arrowNeu)';

              // Cubic bezier curve path
              const dx = tgt.x - src.x;
              const pathD = `M ${src.x + 85} ${src.y + 26} C ${src.x + dx * 0.5} ${src.y + 26}, ${tgt.x - dx * 0.4} ${tgt.y + 26}, ${tgt.x - 5} ${tgt.y + 26}`;

              return (
                <g key={edge.id}>
                  {/* Subtle glow path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isPos ? '#10b981' : isNeg ? '#f43f5e' : '#64748b'}
                    strokeWidth="3"
                    strokeOpacity="0.15"
                  />
                  {/* Active animated stroke */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={edge.weight * 2.2 + 0.5}
                    strokeDasharray="6 4"
                    strokeDashoffset="0"
                    markerEnd={markerEnd}
                    className="transition-all"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="40"
                      to="0"
                      dur={`${3.0 / Math.max(0.5, edge.weight)}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              );
            })}
          </svg>

          {/* Render Graph Nodes */}
          {graph.nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isSelected = selectedNode?.id === node.id;
            const isPos = node.polarity === 'positive';
            const isNeg = node.polarity === 'negative';

            let borderColor = 'border-slate-800';
            let bgGlow = 'hover:border-slate-700';

            if (node.category === 'intervention') {
              borderColor = 'border-indigo-500/60 shadow-indigo-950/30';
              bgGlow = 'hover:border-indigo-400';
            } else if (node.category === 'terminal_outcome') {
              borderColor = isPos ? 'border-emerald-500/70 shadow-emerald-950/40' : 'border-rose-500/70 shadow-rose-950/40';
              bgGlow = isPos ? 'hover:border-emerald-400' : 'hover:border-rose-400';
            } else if (isPos) {
              borderColor = 'border-emerald-500/40';
              bgGlow = 'hover:border-emerald-400';
            } else if (isNeg) {
              borderColor = 'border-rose-500/40';
              bgGlow = 'hover:border-rose-400';
            }

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                style={{
                  left: `${pos.x - 80}px`,
                  top: `${pos.y}px`,
                  width: '165px',
                }}
                className={`absolute p-2.5 rounded-lg bg-slate-900/95 backdrop-blur-md border ${borderColor} ${bgGlow} shadow-lg cursor-pointer transition-all duration-150 z-10 ${
                  isSelected ? 'ring-2 ring-indigo-400 border-indigo-400 scale-105' : 'hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-medium text-slate-300 truncate" title={node.label}>
                    {node.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                      isPos ? 'bg-emerald-500/15 text-emerald-300' : isNeg ? 'bg-rose-500/15 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {node.deltaText}
                  </span>
                </div>

                <div className="text-sm font-bold font-mono text-slate-100 tracking-tight">
                  {node.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Inspection Drawer / Popover */}
      {selectedNode && (
        <div className="absolute bottom-4 left-6 max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl z-30 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                Causal Inspector · Layer {selectedNode.layer}
              </div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>{selectedNode.label}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedNode.value}
                </span>
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {selectedNode.explanation}
          </p>
          <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-300">Impact Mechanism: </span>
            {selectedNode.polarity === 'positive'
              ? 'Contributes positively to enterprise gross margin expansion and unit economics.'
              : selectedNode.polarity === 'negative'
              ? 'Acts as a friction point, causing customer drag or increasing operational overhead.'
              : 'Neutral baseline propagation with historical trend line.'}
          </div>
        </div>
      )}

      {/* Active Branch Narrative Pill in Footer */}
      <div className="px-6 py-2 bg-slate-950/80 border-t border-slate-800/80 text-xs flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-300 capitalize">{activeBranch.name}:</span>
          <span className="truncate">{activeBranch.narrative}</span>
        </div>
        <div className="font-mono text-slate-300 shrink-0 ml-4">
          Terminal P50 MRR: ${(activeBranch.terminalMrr / 1000).toFixed(0)}k/mo
        </div>
      </div>
    </div>
  );
};
