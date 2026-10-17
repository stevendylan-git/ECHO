import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign, Users, AlertOctagon, Scale, BarChart2 } from 'lucide-react';
import { MonthlyTrajectory, SimulationResult } from '../types/index.ts';

interface MetricsPanelProps {
  simulation: SimulationResult | null;
}

type SelectedMetric = 'mrr' | 'grossProfit' | 'activeSubscribers' | 'churnRate';

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ simulation }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>('grossProfit');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!simulation) return null;

  const summary = simulation.summaryComparison;
  const trajectories = simulation.trajectories[selectedMetric];

  // Helper formatting
  const formatVal = (val: number, metric: SelectedMetric) => {
    if (metric === 'mrr' || metric === 'grossProfit') {
      if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
      if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    }
    if (metric === 'churnRate') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };

  const metricLabels: Record<SelectedMetric, string> = {
    grossProfit: 'Gross Operating Profit',
    mrr: 'Monthly Recurring Revenue (MRR)',
    activeSubscribers: 'Active Subscriber Base',
    churnRate: 'Monthly Churn Rate',
  };

  // SVG Chart Dimensions
  const chartWidth = 560;
  const chartHeight = 160;
  const padding = { top: 20, right: 30, bottom: 25, left: 55 };

  // Determine min & max for scale
  const allVals = trajectories.flatMap((t) => [t.p10, t.p50, t.p90, t.baseline]);
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    return padding.left + (index / (trajectories.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return chartHeight - padding.bottom - ((val - minVal) / valRange) * (chartHeight - padding.top - padding.bottom);
  };

  // Envelope polygon: P90 line forward, P10 line backward
  const envelopePoints = [
    ...trajectories.map((t, i) => `${getX(i)},${getY(t.p90)}`),
    ...[...trajectories].reverse().map((t, i) => `${getX(trajectories.length - 1 - i)},${getY(t.p10)}`),
  ].join(' ');

  // Baseline line
  const baselinePath = trajectories.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.baseline)}`).join(' ');

  // P50 line
  const p50Path = trajectories.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.p50)}`).join(' ');

  const activeHover = hoverIndex !== null ? trajectories[hoverIndex] : null;

  return (
    <div className="w-full bg-[#0c121e] border-t border-slate-800/80 shrink-0 z-20 transition-all duration-200">
      {/* Panel Bar Header */}
      <div className="px-6 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>12-Month Projected Trajectory & KPI Ledger</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Monte Carlo Uncertainty Envelope (P10 Bear – P90 Bull)
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          <span>{isCollapsed ? 'Expand Ledger' : 'Collapse Ledger'}</span>
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Side-by-Side KPI Cards (5 cols) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
            {/* Gross Profit Card */}
            <div
              onClick={() => setSelectedMetric('grossProfit')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedMetric === 'grossProfit'
                  ? 'bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Gross Profit</span>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${summary.grossProfit.deltaPct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  {summary.grossProfit.deltaPct >= 0 ? `+${summary.grossProfit.deltaPct}%` : `${summary.grossProfit.deltaPct}%`}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {formatVal(summary.grossProfit.simulated, 'grossProfit')}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Baseline: {formatVal(summary.grossProfit.baseline, 'grossProfit')}
              </div>
            </div>

            {/* MRR Card */}
            <div
              onClick={() => setSelectedMetric('mrr')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedMetric === 'mrr'
                  ? 'bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Monthly MRR</span>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${summary.mrr.deltaPct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  {summary.mrr.deltaPct >= 0 ? `+${summary.mrr.deltaPct}%` : `${summary.mrr.deltaPct}%`}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {formatVal(summary.mrr.simulated, 'mrr')}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Baseline: {formatVal(summary.mrr.baseline, 'mrr')}
              </div>
            </div>

            {/* Subscribers Card */}
            <div
              onClick={() => setSelectedMetric('activeSubscribers')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedMetric === 'activeSubscribers'
                  ? 'bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Active Subscribers</span>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${summary.activeSubscribers.deltaPct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  {summary.activeSubscribers.deltaPct >= 0 ? `+${summary.activeSubscribers.deltaPct}%` : `${summary.activeSubscribers.deltaPct}%`}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {summary.activeSubscribers.simulated.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Baseline: {summary.activeSubscribers.baseline.toLocaleString()}
              </div>
            </div>

            {/* Churn Rate Card */}
            <div
              onClick={() => setSelectedMetric('churnRate')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedMetric === 'churnRate'
                  ? 'bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Monthly Churn</span>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${summary.churnRate.deltaAbs <= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  {summary.churnRate.deltaAbs >= 0 ? `+${summary.churnRate.deltaAbs}%` : `${summary.churnRate.deltaAbs}%`}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {summary.churnRate.simulated.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Baseline: {summary.churnRate.baseline.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 12-Month Projection Chart (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {metricLabels[selectedMetric]}
                </span>
                {activeHover && (
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/50">
                    {activeHover.monthLabel}: {formatVal(activeHover.p50, selectedMetric)} (P10: {formatVal(activeHover.p10, selectedMetric)} · P90: {formatVal(activeHover.p90, selectedMetric)})
                  </span>
                )}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400" />
                  <span>Baseline</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-indigo-500 rounded" />
                  <span>Simulated (P50)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-indigo-500/25 border border-indigo-500/50 rounded" />
                  <span>P10–P90 Envelope</span>
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="relative w-full h-40">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Horizontal grid lines */}
                {[0, 0.33, 0.66, 1].map((pct, i) => {
                  const y = padding.top + pct * (chartHeight - padding.top - padding.bottom);
                  const val = maxVal - pct * valRange;
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {formatVal(val, selectedMetric)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded P10-P90 Envelope */}
                <polygon
                  points={envelopePoints}
                  fill="#6366f1"
                  fillOpacity="0.18"
                  stroke="#6366f1"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                />

                {/* Baseline Dashed Line */}
                <path
                  d={baselinePath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Simulated P50 Solid Line */}
                <path
                  d={p50Path}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />

                {/* Data point dots & hover interactive capture */}
                {trajectories.map((t, idx) => {
                  const x = getX(idx);
                  const yP50 = getY(t.p50);
                  const isHovered = hoverIndex === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIndex(idx)}
                    >
                      {/* Transparent wider target for easy hover */}
                      <rect
                        x={x - 15}
                        y={padding.top}
                        width="30"
                        height={chartHeight - padding.top - padding.bottom}
                        fill="transparent"
                      />

                      {/* X-axis tick */}
                      <text
                        x={x}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        fill={isHovered ? '#f8fafc' : '#64748b'}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight={isHovered ? 'bold' : 'normal'}
                      >
                        {t.monthLabel}
                      </text>

                      {/* Point dot on P50 */}
                      <circle
                        cx={x}
                        cy={yP50}
                        r={isHovered ? 5 : 3}
                        fill={isHovered ? '#38bdf8' : '#6366f1'}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />

                      {/* Hover vertical crosshair */}
                      {isHovered && (
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={chartHeight - padding.bottom}
                          stroke="#38bdf8"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
