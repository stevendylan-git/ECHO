import React, { useState } from 'react';
import { Play, Sliders, Target, Sparkles, RefreshCw, ChevronDown, ChevronUp, Compass, ArrowUpRight } from 'lucide-react';
import { DecisionIntervention, OptimizationResult } from '../types/index.ts';

interface DecisionSidebarProps {
  decision: DecisionIntervention;
  onChangeDecision: (decision: DecisionIntervention) => void;
  onSimulate: (query?: string) => void;
  onOptimize: (objective: OptimizationResult['objective']) => void;
  isLoading: boolean;
  onSelectDatasetPreset: (id: 'saas' | 'ecommerce') => void;
  activeDatasetId: string;
}

export const DecisionSidebar: React.FC<DecisionSidebarProps> = ({
  decision,
  onChangeDecision,
  onSimulate,
  onOptimize,
  isLoading,
  onSelectDatasetPreset,
  activeDatasetId,
}) => {
  const [nlQuery, setNlQuery] = useState(decision.rawQuery || '');
  const [showSliders, setShowSliders] = useState(true);
  const [selectedObjective, setSelectedObjective] = useState<OptimizationResult['objective']>('maximize_profit');

  const presets = [
    { label: '+10% Price & -5% Mktg', query: 'Increase price by 10% and reduce marketing budget by 5%' },
    { label: 'Retention Shield (+4 CS)', query: 'Hire 4 customer support reps and reduce price by 3%' },
    { label: 'Aggressive Margin (+14%)', query: 'Aggressive margin focus: price up 14% and cut marketing 10%' },
    { label: 'Hypergrowth Scale (+25%)', query: 'Increase marketing spend by 25% and hire 5 support reps' },
  ];

  const handleApplyPreset = (query: string) => {
    setNlQuery(query);
    onSimulate(query);
  };

  const handleSliderChange = (field: keyof DecisionIntervention, val: number) => {
    onChangeDecision({
      ...decision,
      [field]: val,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate(nlQuery);
  };

  return (
    <aside className="w-84 lg:w-92 h-full bg-[#0c121e] border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto z-20">
      {/* Top Header / Dataset switch */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Benchmark Environment
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectDatasetPreset('saas')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
              activeDatasetId.includes('saas')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            SaaS Cloud
          </button>
          <button
            onClick={() => onSelectDatasetPreset('ecommerce')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
              activeDatasetId.includes('ecommerce')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            DTC E-Commerce
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Natural Language Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>What-If Decision Prompt</span>
            </label>
          </div>
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <textarea
              rows={3}
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g. Increase price by 12%, trim marketing by 5%, and hire 2 support engineers"
              className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 focus:border-indigo-500/80 transition-all resize-none font-sans leading-relaxed"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 rounded-lg transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Simulating Monte Carlo Paths...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Simulate Future Outcomes</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="mt-3">
            <div className="text-[11px] font-medium text-slate-400 mb-1.5">Quick Scenarios</div>
            <div className="grid grid-cols-1 gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(preset.query)}
                  className="w-full text-left text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded px-2.5 py-1.5 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <span className="truncate">{preset.label}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible Fine-Tuning Levers */}
        <div className="border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setShowSliders(!showSliders)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 cursor-pointer mb-3"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Intervention Levers</span>
            </span>
            {showSliders ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {showSliders && (
            <div className="space-y-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              {/* Price Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Price Adjustment</span>
                  <span className={`font-mono font-semibold ${decision.priceDeltaPct > 0 ? 'text-indigo-400' : decision.priceDeltaPct < 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {decision.priceDeltaPct >= 0 ? `+${decision.priceDeltaPct}%` : `${decision.priceDeltaPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={50}
                  step={1}
                  value={decision.priceDeltaPct}
                  onChange={(e) => handleSliderChange('priceDeltaPct', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>-30%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Marketing Spend Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Marketing Budget</span>
                  <span className={`font-mono font-semibold ${decision.marketingSpendDeltaPct > 0 ? 'text-cyan-400' : decision.marketingSpendDeltaPct < 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {decision.marketingSpendDeltaPct >= 0 ? `+${decision.marketingSpendDeltaPct}%` : `${decision.marketingSpendDeltaPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={100}
                  step={5}
                  value={decision.marketingSpendDeltaPct}
                  onChange={(e) => handleSliderChange('marketingSpendDeltaPct', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+100%</span>
                </div>
              </div>

              {/* Support Headcount Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Customer Support Staff</span>
                  <span className={`font-mono font-semibold ${decision.headcountDelta > 0 ? 'text-emerald-400' : decision.headcountDelta < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {decision.headcountDelta >= 0 ? `+${decision.headcountDelta} Reps` : `${decision.headcountDelta} Reps`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={15}
                  step={1}
                  value={decision.headcountDelta}
                  onChange={(e) => handleSliderChange('headcountDelta', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>-5</span>
                  <span>0</span>
                  <span>+15</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onSimulate()}
                  disabled={isLoading}
                  className="w-full py-1.5 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded transition-colors cursor-pointer text-center"
                >
                  Recalculate with Slider Values
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Counterfactual Optimizer Trigger */}
        <div className="border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Counterfactual Search</span>
            </span>
          </div>

          <div className="space-y-2">
            <select
              value={selectedObjective}
              onChange={(e) => setSelectedObjective(e.target.value as OptimizationResult['objective'])}
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded-md p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="maximize_profit">Objective: Maximize Gross Profit</option>
              <option value="maximize_revenue">Objective: Maximize MRR / Revenue</option>
              <option value="minimize_churn">Objective: Minimize Customer Churn</option>
              <option value="maximize_ltv_cac">Objective: Maximize LTV / CAC Ratio</option>
            </select>

            <button
              onClick={() => onOptimize(selectedObjective)}
              disabled={isLoading}
              className="w-full py-2 px-3 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Search Optimal Decision Frontiers</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
