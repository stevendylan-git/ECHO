import React from 'react';
import { X, Database, Table, Sliders, Target, CheckCircle2 } from 'lucide-react';
import { BaselineState, DataPoint, DatasetMetadata } from '../types/index.ts';

interface DatasetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: DatasetMetadata | null;
  data: DataPoint[];
  baseline: BaselineState | null;
}

export const DatasetDetailModal: React.FC<DatasetDetailModalProps> = ({
  isOpen,
  onClose,
  metadata,
  data,
  baseline,
}) => {
  if (!isOpen || !metadata) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{metadata.name}</h3>
              <p className="text-xs text-slate-400">
                {metadata.rowCount} monthly records ({metadata.startDate} → {metadata.endDate}) · {metadata.columns.length} columns
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Elasticity Summary Card */}
          {baseline && (
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Model Invariants & Empirical Elasticities
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Price Elasticity (PED)</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    {baseline.empiricalElasticities.priceElasticityOfDemand}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Conversion sensitivity</div>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Price-to-Churn Elasticity</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    +{baseline.empiricalElasticities.priceElasticityOfChurn}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Attrition sensitivity</div>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Marketing Spend Return</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    {baseline.empiricalElasticities.marketingSpendElasticity}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Diminishing power curve</div>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Support Queue Elasticity</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    {baseline.empiricalElasticities.supportLoadElasticityOfChurn}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Rep capacity cushion</div>
                </div>
              </div>
            </div>
          )}

          {/* Column Classification */}
          <div>
            <div className="text-xs font-semibold text-slate-200 mb-2">Column Classification & Roles</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {metadata.columns.map((col) => (
                <div key={col.name} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-slate-200 text-[11px] truncate" title={col.name}>{col.name}</span>
                    <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">{col.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {col.isActionableLever && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/30">
                        Actionable Lever
                      </span>
                    )}
                    {col.isTargetKpi && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30">
                        Target KPI
                      </span>
                    )}
                    {!col.isActionableLever && !col.isTargetKpi && (
                      <span className="text-[9px] text-slate-400">Contextual feature</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table Preview */}
          <div>
            <div className="text-xs font-semibold text-slate-200 mb-2">Recent Historical Trajectory (First 10 Rows)</div>
            <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    {metadata.columns.map((col) => (
                      <th key={col.name} className="p-2 whitespace-nowrap">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.slice(0, 10).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/40 text-slate-300">
                      {metadata.columns.map((col) => (
                        <td key={col.name} className="p-2 whitespace-nowrap">
                          {typeof row[col.name] === 'number'
                            ? Number(row[col.name]).toLocaleString()
                            : String(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
