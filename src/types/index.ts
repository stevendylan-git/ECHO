export interface DataPoint {
  [key: string]: string | number;
}

export interface DatasetColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'temporal';
  mean?: number;
  min?: number;
  max?: number;
  isActionableLever: boolean;
  isTargetKpi: boolean;
  label: string;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  type: 'saas' | 'ecommerce' | 'custom';
  rowCount: number;
  timeColumn: string;
  startDate: string;
  endDate: string;
  columns: DatasetColumnInfo[];
  description: string;
}

export interface DecisionIntervention {
  priceDeltaPct: number;          // e.g. +10 (meaning +10%)
  marketingSpendDeltaPct: number; // e.g. -5 (meaning -5%)
  headcountDelta: number;         // e.g. +2 (people)
  discountRateDeltaPct: number;   // e.g. -2 (%)
  rawQuery?: string;
  notes?: string;
}

export interface BaselineMetricSummary {
  currentValue: number;
  movingAverage3m: number;
  historicalVolatility: number;
  growthRatePct: number;
}

export interface BaselineState {
  datasetId: string;
  horizonMonths: number;
  metrics: {
    mrr?: BaselineMetricSummary;
    grossProfit?: BaselineMetricSummary;
    activeSubscribers?: BaselineMetricSummary;
    churnRate?: BaselineMetricSummary;
    cac?: BaselineMetricSummary;
    ltv?: BaselineMetricSummary;
    ltvCacRatio?: BaselineMetricSummary;
    revenue?: BaselineMetricSummary;
    orders?: BaselineMetricSummary;
  };
  empiricalElasticities: {
    priceElasticityOfDemand: number;
    priceElasticityOfChurn: number;
    marketingSpendElasticity: number;
    supportLoadElasticityOfChurn: number;
  };
  projections: Array<{
    month: number;
    monthLabel: string;
    mrr: number;
    grossProfit: number;
    activeSubscribers: number;
    churnRate: number;
    revenue?: number;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  category: 'intervention' | 'direct_effect' | 'behavioral_shift' | 'kpi_impact' | 'terminal_outcome';
  layer: number; // 1 to 5
  value: string;
  deltaText: string;
  deltaPct: number;
  polarity: 'positive' | 'negative' | 'neutral';
  explanation: string;
  metricKey?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number; // 0.1 to 1.0
  polarity: 'positive' | 'negative' | 'neutral';
  mechanism: string;
}

export interface ConsequenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MonthlyTrajectory {
  month: number;
  monthLabel: string;
  p10: number;
  p50: number;
  p90: number;
  baseline: number;
}

export interface FutureBranch {
  id: 'optimistic' | 'expected' | 'pessimistic';
  name: string;
  probabilityPct: number;
  color: string;
  narrative: string;
  keyCondition: string;
  terminalMrr: number;
  terminalGrossProfit: number;
  terminalSubscribers: number;
  terminalChurnRate: number;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  interpretedDecision: DecisionIntervention;
  summaryComparison: {
    mrr: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    grossProfit: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    activeSubscribers: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    churnRate: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    cac: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    ltv: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
    ltvCacRatio: { baseline: number; simulated: number; deltaPct: number; deltaAbs: number };
  };
  trajectories: {
    mrr: MonthlyTrajectory[];
    grossProfit: MonthlyTrajectory[];
    activeSubscribers: MonthlyTrajectory[];
    churnRate: MonthlyTrajectory[];
  };
  futureBranches: FutureBranch[];
  consequenceGraph: ConsequenceGraph;
  riskAssessment: {
    downsideProbabilityPct: number;
    valueAtRisk90Pct: number;
    breakEvenMonth: number | null;
  };
}

export interface ExplanationPayload {
  executiveTakeaway: string;
  primaryDrivers: Array<{
    factor: string;
    impact: string;
    direction: 'positive' | 'negative';
  }>;
  secondOrderEffects: string[];
  tradeOffs: Array<{
    gain: string;
    sacrifice: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  downsideRisks: string[];
  counterfactualGuidance: string;
  evidencePoints: string[];
  isAiGenerated: boolean;
}

export interface CandidateDecision {
  id: string;
  title: string;
  description: string;
  intervention: DecisionIntervention;
  objectiveScore: number;
  expectedProfitDeltaPct: number;
  expectedMrrDeltaPct: number;
  expectedChurnDeltaPct: number;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
}

export interface OptimizationResult {
  objective: 'maximize_profit' | 'maximize_revenue' | 'minimize_churn' | 'maximize_ltv_cac';
  objectiveLabel: string;
  bestCandidate: CandidateDecision;
  candidates: CandidateDecision[];
}
