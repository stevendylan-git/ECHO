import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ArrowRight, X } from 'lucide-react';
import { DataPoint, DatasetMetadata } from '../types/index.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetUploaded: (metadata: DatasetMetadata, data: DataPoint[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetUploaded,
}) => {
  const [csvText, setCsvText] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [parsedRows, setParsedRows] = useState<DataPoint[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleParseCsv = (text: string) => {
    setCsvText(text);
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    Papa.parse<Record<string, any>>(text.trim(), {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg(results.errors[0].message);
          return;
        }

        const validRows = results.data as DataPoint[];
        if (validRows.length < 3) {
          setErrorMsg('CSV must contain at least 3 rows of historical time-series data.');
          return;
        }

        setParsedRows(validRows);
      },
      error: (err: any) => {
        setErrorMsg(err?.message || 'Error parsing CSV file');
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDatasetName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (parsedRows.length < 3) {
      setErrorMsg('Please provide a valid CSV dataset with at least 3 rows.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datasetName || 'Custom Business Metrics',
          rows: parsedRows,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload dataset');
      }

      const result = await res.json();
      onDatasetUploaded(result.metadata, result.data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Upload Historical Dataset</h3>
              <p className="text-xs text-slate-400">Ingest real-world CSV metrics to simulate counterfactuals</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Dataset Name</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g. Acme SaaS Fiscal Metrics 2024-2025"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Upload CSV File</label>
            <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-5 text-center transition-colors cursor-pointer bg-slate-900/40">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                <FileText className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-slate-200 font-semibold">Click to choose a CSV file</span>
                <span className="text-slate-500 text-[11px] mt-0.5">Supports monthly time series with price, revenue, churn, or costs</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Or Paste Raw CSV Text</label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => handleParseCsv(e.target.value)}
              placeholder="month,price,marketing_spend,conversion_rate,churn_rate,mrr,gross_profit&#10;2024-01,49.00,32000,2.65,3.15,889980,645000&#10;..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
            />
          </div>

          {parsedRows.length > 0 && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Successfully parsed {parsedRows.length} rows and {Object.keys(parsedRows[0]).length} columns</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Ready for simulation
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={parsedRows.length < 3 || isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>Activate Dataset & Run Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
