import React from 'react';
import { Sparkles, UploadCloud, Layers, BarChart3, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenDataset: () => void;
  onOpenComparison: () => void;
  activeDatasetName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenDataset,
  onOpenComparison,
  activeDatasetName,
}) => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 shrink-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
          Future Echo
        </span>
        <span className="text-xs text-slate-400 border border-slate-800 bg-slate-900/60 px-2 py-0.5 rounded font-mono truncate max-w-[200px]" title={activeDatasetName}>
          {activeDatasetName}
        </span>
      </div>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
        <button
          onClick={onOpenDataset}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Active Dataset</span>
        </button>
        <button
          onClick={onOpenComparison}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
          <span>Scenario Comparison</span>
        </button>
        <a
          href="#projections"
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          Monte Carlo Projections
        </a>
        <a
          href="#dag"
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          Causal Consequence Graph
        </a>
      </nav>

      {/* Zone 3: Primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenUpload}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700/70 rounded-md hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Dataset</span>
        </button>
      </div>
    </header>
  );
};
