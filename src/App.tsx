import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { DecisionSidebar } from './components/DecisionSidebar.tsx';
import { ConsequenceDAG } from './components/ConsequenceDAG.tsx';
import { ExplanationCard } from './components/ExplanationCard.tsx';
import { MetricsPanel } from './components/MetricsPanel.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { ComparisonModal } from './components/ComparisonModal.tsx';
import { DatasetDetailModal } from './components/DatasetDetailModal.tsx';
import {
  BaselineState,
  CandidateDecision,
  DataPoint,
  DatasetMetadata,
  DecisionIntervention,
  ExplanationPayload,
  FutureBranch,
  OptimizationResult,
  SimulationResult,
} from './types/index.ts';

export default function App() {
  const [activeDatasetId, setActiveDatasetId] = useState('saas-benchmark');
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  const [baseline, setBaseline] = useState<BaselineState | null>(null);

  // Decision State
  const [decision, setDecision] = useState<DecisionIntervention>({
    priceDeltaPct: 10,
    marketingSpendDeltaPct: -5,
    headcountDelta: 0,
    discountRateDeltaPct: 0,
    rawQuery: 'Increase price by 10% and trim marketing budget by 5%',
  });

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<FutureBranch['id']>('expected');
  const [explanation, setExplanation] = useState<ExplanationPayload | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);

  // Optimizer & Comparison State
  const [candidates, setCandidates] = useState<CandidateDecision[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);

  // Fetch dataset on mount or dataset switch
  const loadDataset = async (datasetId: string) => {
    try {
      setIsSimulating(true);
      const res = await fetch(`/api/dataset/sample?id=${datasetId}`);
      if (!res.ok) throw new Error('Failed to load dataset');
      const json = await res.json();
      setMetadata(json.metadata);
      setData(json.data);
      setActiveDatasetId(json.metadata.id);

      // Load baseline
      const baseRes = await fetch(`/api/baseline?datasetId=${json.metadata.id}&horizon=12`);
      if (baseRes.ok) {
        const baseJson = await baseRes.json();
        setBaseline(baseJson);
      }

      // Initial simulation
      await executeSimulation(decision, json.metadata.id);
    } catch (err) {
      console.error('Failed to initialize dataset:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    loadDataset('saas-benchmark');
  }, []);

  // Execute simulation and asynchronously trigger Gemini explanation
  const executeSimulation = async (targetDecision: DecisionIntervention, targetDatasetId = activeDatasetId) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: targetDatasetId,
          decision: targetDecision,
          horizon: 12,
          numRuns: 250,
        }),
      });

      if (!res.ok) throw new Error('Simulation failed');
      const simResult: SimulationResult = await res.json();
      setSimulation(simResult);
      setActiveBranchId('expected');

      // Trigger Gemini explanation
      triggerExplanation(simResult);

      // Also pre-fetch counterfactual optimization candidates
      fetchOptimizerCandidates('maximize_profit', targetDatasetId);
    } catch (err) {
      console.error('Error running simulation:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const triggerExplanation = async (simResult: SimulationResult) => {
    setIsExplaining(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: simResult,
          userContext: 'Evaluate sustainable enterprise profitability, customer retention trade-offs, and risk envelope.',
        }),
      });

      if (res.ok) {
        const explResult: ExplanationPayload = await res.json();
        setExplanation(explResult);
      }
    } catch (err) {
      console.error('Explanation request failed:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  const fetchOptimizerCandidates = async (objective: OptimizationResult['objective'], dsId = activeDatasetId) => {
    try {
      const res = await fetch(`/api/optimize?datasetId=${dsId}&objective=${objective}&horizon=12`);
      if (res.ok) {
        const json: OptimizationResult = await res.json();
        setCandidates(json.candidates);
      }
    } catch (err) {
      console.error('Optimizer request failed:', err);
    }
  };

  const handleSimulate = (query?: string) => {
    let target = { ...decision };
    if (query) {
      target.rawQuery = query;
      // Fetch parsed decision or let the server parse
      fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: activeDatasetId,
          query,
          horizon: 12,
          numRuns: 250,
        }),
      })
        .then((res) => res.json())
        .then((simResult: SimulationResult) => {
          setDecision(simResult.interpretedDecision);
          setSimulation(simResult);
          setActiveBranchId('expected');
          triggerExplanation(simResult);
          fetchOptimizerCandidates('maximize_profit');
        })
        .catch((err) => console.error(err));
      return;
    }
    executeSimulation(target);
  };

  const handleOptimize = async (objective: OptimizationResult['objective']) => {
    setIsSimulating(true);
    try {
      const res = await fetch(`/api/optimize?datasetId=${activeDatasetId}&objective=${objective}&horizon=12`);
      if (res.ok) {
        const json: OptimizationResult = await res.json();
        setCandidates(json.candidates);
        // Automatically open scenario comparison modal
        setIsComparisonOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSelectDatasetPreset = (id: 'saas' | 'ecommerce') => {
    const targetId = id === 'saas' ? 'saas-benchmark' : 'ecommerce-benchmark';
    loadDataset(targetId);
  };

  const handleCustomDatasetUploaded = (newMeta: DatasetMetadata, newRows: DataPoint[]) => {
    setMetadata(newMeta);
    setData(newRows);
    setActiveDatasetId(newMeta.id);

    // Recalculate baseline and simulate
    fetch(`/api/baseline?datasetId=${newMeta.id}&horizon=12`)
      .then((r) => r.json())
      .then((b) => setBaseline(b));

    executeSimulation(decision, newMeta.id);
  };

  const handleApplyScenario = (appliedDecision: DecisionIntervention) => {
    setDecision(appliedDecision);
    executeSimulation(appliedDecision);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      {/* 3-Zone Top Bar Contract */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenDataset={() => setIsDatasetOpen(true)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        activeDatasetName={metadata?.name || 'Loading dataset...'}
      />

      {/* Main App Canvas: Sidebar (Zone 1) + Consequence DAG (Zone 2) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Zone 1: Decision Input Sidebar */}
        <DecisionSidebar
          decision={decision}
          onChangeDecision={setDecision}
          onSimulate={handleSimulate}
          onOptimize={handleOptimize}
          isLoading={isSimulating}
          onSelectDatasetPreset={handleSelectDatasetPreset}
          activeDatasetId={activeDatasetId}
        />

        {/* Zone 2: Consequence Graph Canvas & Floating Explanation */}
        <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-[#080c14]">
          {simulation ? (
            <>
              <ConsequenceDAG
                graph={simulation.consequenceGraph}
                futureBranches={simulation.futureBranches}
                activeBranchId={activeBranchId}
                onSelectBranch={setActiveBranchId}
              />
              <ExplanationCard
                explanation={explanation}
                isLoading={isExplaining}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Initialising simulation models...
            </div>
          )}

          {/* Zone 3: Bottom Metrics Ledger & Uncertainty Chart */}
          <MetricsPanel simulation={simulation} />
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetUploaded={handleCustomDatasetUploaded}
      />

      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        simulation={simulation}
        candidates={candidates}
        onApplyScenario={handleApplyScenario}
      />

      <DatasetDetailModal
        isOpen={isDatasetOpen}
        onClose={() => setIsDatasetOpen(false)}
        metadata={metadata}
        data={data}
        baseline={baseline}
      />
    </div>
  );
}
