import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { ExplanationPayload } from '../types/index.ts';

interface ExplanationCardProps {
  explanation: ExplanationPayload | null;
  isLoading: boolean;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  explanation,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="absolute top-14 right-6 w-88 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl z-20 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
          <div className="text-xs font-semibold text-slate-300">Synthesizing Consequence Chain...</div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-800 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="absolute top-14 right-6 w-92 md:w-96 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl z-20 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-100">
            Executive Consequence Analysis
          </span>
          {explanation.isAiGenerated && (
            <span className="text-[10px] font-mono font-medium text-cyan-400 border border-cyan-800/50 bg-cyan-950/40 px-1.5 py-0.2 rounded">
              Gemini 3.8 Flash
            </span>
          )}
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* Executive Takeaway */}
          <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-lg">
            <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mb-1">
              Core Executive Verdict
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              {explanation.executiveTakeaway}
            </p>
          </div>

          {/* Primary Drivers */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Primary Causal Drivers
            </div>
            <div className="space-y-1.5">
              {explanation.primaryDrivers.map((driver, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-start gap-2"
                >
                  {driver.direction === 'positive' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-200">{driver.factor}</div>
                    <div className="text-slate-400 text-[11px] leading-tight mt-0.5">{driver.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade-Off Matrix */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Trade-Off Matrix (Gain vs Sacrifice)
            </div>
            <div className="space-y-2">
              {explanation.tradeOffs.map((trade, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gain: {trade.gain}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Cost: {trade.sacrifice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Second Order Consequences */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Second-Order Consequences
            </div>
            <ul className="space-y-1.5 pl-1">
              {explanation.secondOrderEffects.map((effect, idx) => (
                <li key={idx} className="text-slate-300 text-[11px] leading-relaxed flex items-start gap-1.5">
                  <span className="text-indigo-400 font-bold shrink-0 mt-0.5">·</span>
                  <span>{effect}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Counterfactual Guidance */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg">
            <div className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Counterfactual Recommendation</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.counterfactualGuidance}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
