import React from 'react';
import { X, Check, ArrowRight, BarChart3, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { CandidateDecision, DecisionIntervention, SimulationResult } from '../types/index.ts';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: SimulationResult | null;
  candidates: CandidateDecision[];
  onApplyScenario: (decision: DecisionIntervention) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  simulation,
  candidates,
  onApplyScenario,
}) => {
  if (!isOpen || !simulation) return null;

  const currentSummary = simulation.summaryComparison;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Scenario Comparison & Strategy Matrix</h3>
              <p className="text-xs text-slate-400">Evaluate counterfactual decisions across trade-offs and risk profiles</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Comparison Matrix Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                  <th className="p-3">Scenario / Decision</th>
                  <th className="p-3">Price Δ</th>
                  <th className="p-3">Spend Δ</th>
                  <th className="p-3">Staff Δ</th>
                  <th className="p-3">MRR (12mo)</th>
                  <th className="p-3">Gross Profit</th>
                  <th className="p-3">Churn Rate</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {/* 1. Baseline */}
                <tr className="bg-slate-950/40 text-slate-400">
                  <td className="p-3 font-sans font-medium text-slate-300">
                    Baseline (Status-Quo)
                  </td>
                  <td className="p-3">0%</td>
                  <td className="p-3">0%</td>
                  <td className="p-3">0</td>
                  <td className="p-3 text-slate-200">${(currentSummary.mrr.baseline / 1000).toFixed(0)}k</td>
                  <td className="p-3 text-slate-200">${(currentSummary.grossProfit.baseline / 1000).toFixed(0)}k</td>
                  <td className="p-3">{currentSummary.churnRate.baseline.toFixed(2)}%</td>
                  <td className="p-3 text-right">
                    <span className="text-[10px] text-slate-500 font-sans">Current</span>
                  </td>
                </tr>

                {/* 2. Current User Simulation */}
                <tr className="bg-indigo-950/20 text-slate-200 border-l-2 border-l-indigo-500">
                  <td className="p-3 font-sans font-medium text-indigo-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Current Simulated Decision</span>
                  </td>
                  <td className="p-3 font-semibold text-indigo-300">
                    {simulation.interpretedDecision.priceDeltaPct >= 0 ? `+${simulation.interpretedDecision.priceDeltaPct}%` : `${simulation.interpretedDecision.priceDeltaPct}%`}
                  </td>
                  <td className="p-3">
                    {simulation.interpretedDecision.marketingSpendDeltaPct >= 0 ? `+${simulation.interpretedDecision.marketingSpendDeltaPct}%` : `${simulation.interpretedDecision.marketingSpendDeltaPct}%`}
                  </td>
                  <td className="p-3">
                    {simulation.interpretedDecision.headcountDelta >= 0 ? `+${simulation.interpretedDecision.headcountDelta}` : `${simulation.interpretedDecision.headcountDelta}`}
                  </td>
                  <td className="p-3 font-semibold text-slate-100">
                    ${(currentSummary.mrr.simulated / 1000).toFixed(0)}k
                    <span className={`text-[10px] ml-1.5 ${currentSummary.mrr.deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({currentSummary.mrr.deltaPct >= 0 ? '+' : ''}{currentSummary.mrr.deltaPct}%)
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-100">
                    ${(currentSummary.grossProfit.simulated / 1000).toFixed(0)}k
                    <span className={`text-[10px] ml-1.5 ${currentSummary.grossProfit.deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({currentSummary.grossProfit.deltaPct >= 0 ? '+' : ''}{currentSummary.grossProfit.deltaPct}%)
                    </span>
                  </td>
                  <td className="p-3">
                    {currentSummary.churnRate.simulated.toFixed(2)}%
                    <span className={`text-[10px] ml-1.5 ${currentSummary.churnRate.deltaAbs <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({currentSummary.churnRate.deltaAbs >= 0 ? '+' : ''}{currentSummary.churnRate.deltaAbs}%)
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Active
                    </span>
                  </td>
                </tr>

                {/* 3. Candidate Decisions from Optimizer */}
                {candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-200">
                      <div>{cand.title}</div>
                      <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{cand.description}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      {cand.intervention.priceDeltaPct >= 0 ? `+${cand.intervention.priceDeltaPct}%` : `${cand.intervention.priceDeltaPct}%`}
                    </td>
                    <td className="p-3 text-slate-300">
                      {cand.intervention.marketingSpendDeltaPct >= 0 ? `+${cand.intervention.marketingSpendDeltaPct}%` : `${cand.intervention.marketingSpendDeltaPct}%`}
                    </td>
                    <td className="p-3 text-slate-300">
                      {cand.intervention.headcountDelta >= 0 ? `+${cand.intervention.headcountDelta}` : `${cand.intervention.headcountDelta}`}
                    </td>
                    <td className="p-3">
                      <span className={cand.expectedMrrDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {cand.expectedMrrDeltaPct >= 0 ? `+${cand.expectedMrrDeltaPct}%` : `${cand.expectedMrrDeltaPct}%`}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cand.expectedProfitDeltaPct >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                        {cand.expectedProfitDeltaPct >= 0 ? `+${cand.expectedProfitDeltaPct}%` : `${cand.expectedProfitDeltaPct}%`}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cand.expectedChurnDeltaPct <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {cand.expectedChurnDeltaPct >= 0 ? `+${cand.expectedChurnDeltaPct}%` : `${cand.expectedChurnDeltaPct}%`}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          onApplyScenario(cand.intervention);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-[11px] font-sans font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Click &quot;Apply&quot; to test any alternative strategy in the live consequence DAG.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
