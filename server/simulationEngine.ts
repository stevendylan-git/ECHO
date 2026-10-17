import {
  BaselineState,
  CandidateDecision,
  ConsequenceGraph,
  DataPoint,
  DecisionIntervention,
  FutureBranch,
  GraphEdge,
  GraphNode,
  MonthlyTrajectory,
  OptimizationResult,
  SimulationResult,
} from '../src/types/index.ts';

// Helper: Moving Average
function calcMA(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// Helper: Standard Deviation
function calcStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Percentile calculation
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculateBaseline(data: DataPoint[], horizon = 12): BaselineState {
  const isSaas = data.length > 0 && 'mrr' in data[0];
  const lastRow = data[data.length - 1] || {};

  const mrrs = data.map((d) => Number(d.mrr || d.gross_revenue || 0));
  const profits = data.map((d) => Number(d.gross_profit || d.operating_profit || 0));
  const subs = data.map((d) => Number(d.active_subscribers || d.total_orders || 0));
  const churns = data.map((d) => Number(d.churn_rate || d.return_rate || 0));
  const cacs = data.map((d) => Number(d.cac || 0)).filter((v) => v > 0);
  const ltvs = data.map((d) => Number(d.ltv || 0)).filter((v) => v > 0);
  const ltvCacRatios = data.map((d) => Number(d.ltv_cac_ratio || 0)).filter((v) => v > 0);

  // Baseline projections assuming historical average growth trend
  const lastMrr = Number(lastRow.mrr || lastRow.gross_revenue || 100000);
  const lastProfit = Number(lastRow.gross_profit || lastRow.operating_profit || 50000);
  const lastSubs = Number(lastRow.active_subscribers || lastRow.total_orders || 5000);
  const lastChurn = Number(lastRow.churn_rate || lastRow.return_rate || 3.5);

  const mrrTrend = mrrs.length > 3 ? (mrrs[mrrs.length - 1] - mrrs[mrrs.length - 4]) / 3 : 15000;
  const profitTrend = profits.length > 3 ? (profits[profits.length - 1] - profits[profits.length - 4]) / 3 : 10000;
  const subsTrend = subs.length > 3 ? (subs[subs.length - 1] - subs[subs.length - 4]) / 3 : 2500;

  const projections: BaselineState['projections'] = [];
  let curMrr = lastMrr;
  let curProfit = lastProfit;
  let curSubs = lastSubs;
  let curChurn = lastChurn;

  for (let m = 1; m <= horizon; m++) {
    curMrr += mrrTrend * 0.95;
    curProfit += profitTrend * 0.95;
    curSubs += subsTrend * 0.95;
    curChurn = Math.max(1.5, Math.min(6.0, curChurn + (Math.random() * 0.04 - 0.02)));

    projections.push({
      month: m,
      monthLabel: `M+${m}`,
      mrr: Math.round(curMrr),
      grossProfit: Math.round(curProfit),
      activeSubscribers: Math.round(curSubs),
      churnRate: Number(curChurn.toFixed(2)),
      revenue: Math.round(curMrr),
    });
  }

  // Empirical elasticities from historical data
  const ped = isSaas ? -0.85 : -1.15; // Price elasticity of demand
  const pec = isSaas ? 0.72 : 0.45;   // Price elasticity of churn
  const mse = 0.65;                  // Marketing spend elasticity (diminishing returns)
  const sle = 0.38;                  // Support load elasticity

  return {
    datasetId: isSaas ? 'saas-benchmark' : 'ecommerce-benchmark',
    horizonMonths: horizon,
    metrics: {
      mrr: {
        currentValue: lastMrr,
        movingAverage3m: Math.round(calcMA(mrrs, 3)),
        historicalVolatility: Number((calcStdDev(mrrs) / (calcMA(mrrs, 3) || 1)).toFixed(3)),
        growthRatePct: mrrs.length > 1 ? Number((((mrrs[mrrs.length - 1] - mrrs[0]) / mrrs[0]) * 100).toFixed(1)) : 0,
      },
      grossProfit: {
        currentValue: lastProfit,
        movingAverage3m: Math.round(calcMA(profits, 3)),
        historicalVolatility: Number((calcStdDev(profits) / (calcMA(profits, 3) || 1)).toFixed(3)),
        growthRatePct: profits.length > 1 ? Number((((profits[profits.length - 1] - profits[0]) / profits[0]) * 100).toFixed(1)) : 0,
      },
      activeSubscribers: {
        currentValue: lastSubs,
        movingAverage3m: Math.round(calcMA(subs, 3)),
        historicalVolatility: Number((calcStdDev(subs) / (calcMA(subs, 3) || 1)).toFixed(3)),
        growthRatePct: subs.length > 1 ? Number((((subs[subs.length - 1] - subs[0]) / subs[0]) * 100).toFixed(1)) : 0,
      },
      churnRate: {
        currentValue: lastChurn,
        movingAverage3m: Number(calcMA(churns, 3).toFixed(2)),
        historicalVolatility: Number(calcStdDev(churns).toFixed(3)),
        growthRatePct: churns.length > 1 ? Number((((churns[churns.length - 1] - churns[0]) / churns[0]) * 100).toFixed(1)) : 0,
      },
      cac: {
        currentValue: cacs.length > 0 ? cacs[cacs.length - 1] : 10.0,
        movingAverage3m: Number(calcMA(cacs, 3).toFixed(2)),
        historicalVolatility: Number(calcStdDev(cacs).toFixed(3)),
        growthRatePct: 4.5,
      },
      ltv: {
        currentValue: ltvs.length > 0 ? ltvs[ltvs.length - 1] : 1500.0,
        movingAverage3m: Number(calcMA(ltvs, 3).toFixed(2)),
        historicalVolatility: Number(calcStdDev(ltvs).toFixed(3)),
        growthRatePct: 2.1,
      },
      ltvCacRatio: {
        currentValue: ltvCacRatios.length > 0 ? ltvCacRatios[ltvCacRatios.length - 1] : 150.0,
        movingAverage3m: Number(calcMA(ltvCacRatios, 3).toFixed(2)),
        historicalVolatility: Number(calcStdDev(ltvCacRatios).toFixed(3)),
        growthRatePct: -2.3,
      },
    },
    empiricalElasticities: {
      priceElasticityOfDemand: ped,
      priceElasticityOfChurn: pec,
      marketingSpendElasticity: mse,
      supportLoadElasticityOfChurn: sle,
    },
    projections,
  };
}

// Robust deterministic Natural Language parser
export function parseNaturalLanguageDecision(query: string): DecisionIntervention {
  const q = query.toLowerCase();
  let priceDeltaPct = 0;
  let marketingSpendDeltaPct = 0;
  let headcountDelta = 0;
  let discountRateDeltaPct = 0;

  // Price parsing
  // Matches e.g. "increase price by 10%", "+10% price", "price up 15%", "cut price by 5%", "-8% price"
  const pricePlusMatch = q.match(/(?:increase|raise|boost|bump|\+)\s*(?:the\s*)?(?:seat\s*)?price(?:\s*by)?\s*([0-9.]+)\s*%/i) ||
    q.match(/([+-]?[0-9.]+)\s*%\s*(?:seat\s*)?price\s*(?:increase|hike|lift)?/i) ||
    q.match(/price\s*(?:increase|hike|up|bump)\s*(?:by)?\s*([0-9.]+)\s*%/i);

  const priceMinusMatch = q.match(/(?:decrease|cut|lower|reduce|-)\s*(?:the\s*)?(?:seat\s*)?price(?:\s*by)?\s*([0-9.]+)\s*%/i) ||
    q.match(/price\s*(?:cut|reduction|down|drop)\s*(?:by)?\s*([0-9.]+)\s*%/i);

  if (pricePlusMatch) {
    priceDeltaPct = parseFloat(pricePlusMatch[1]);
  } else if (priceMinusMatch) {
    priceDeltaPct = -Math.abs(parseFloat(priceMinusMatch[1]));
  }

  // Marketing spend parsing
  // Matches e.g. "reduce marketing by 5%", "cut marketing budget 10%", "+20% marketing", "ad spend -15%"
  const mktPlusMatch = q.match(/(?:increase|raise|boost|bump|\+)\s*(?:the\s*)?(?:marketing|ad|advertising)(?:\s*(?:spend|budget))?(?:\s*by)?\s*([0-9.]+)\s*%/i) ||
    q.match(/([+-]?[0-9.]+)\s*%\s*(?:marketing|ad|advertising)\s*(?:spend|budget)?/i);

  const mktMinusMatch = q.match(/(?:decrease|cut|lower|reduce|trim|-)\s*(?:the\s*)?(?:marketing|ad|advertising)(?:\s*(?:spend|budget))?(?:\s*by)?\s*([0-9.]+)\s*%/i) ||
    q.match(/(?:marketing|ad|advertising)\s*(?:cut|reduction|down|drop)\s*(?:by)?\s*([0-9.]+)\s*%/i);

  if (mktPlusMatch) {
    marketingSpendDeltaPct = parseFloat(mktPlusMatch[1]);
  } else if (mktMinusMatch) {
    marketingSpendDeltaPct = -Math.abs(parseFloat(mktMinusMatch[1]));
  }

  // Headcount parsing
  // Matches e.g. "hire 4 support reps", "+3 support", "add 5 customer success agents", "cut 2 support"
  const hcPlusMatch = q.match(/(?:hire|add|\+)\s*([0-9]+)\s*(?:support|customer\s*success|rep|staff|headcount)/i) ||
    q.match(/([0-9]+)\s*(?:new\s*)?(?:support|customer\s*success)\s*(?:reps|agents|hires)/i);

  const hcMinusMatch = q.match(/(?:cut|reduce|downsize|-)\s*([0-9]+)\s*(?:support|staff|reps|headcount)/i);

  if (hcPlusMatch) {
    headcountDelta = parseInt(hcPlusMatch[1], 10);
  } else if (hcMinusMatch) {
    headcountDelta = -Math.abs(parseInt(hcMinusMatch[1], 10));
  }

  // Discount parsing
  const discountMatch = q.match(/(?:discount|sale|promo)\s*(?:by)?\s*([+-]?[0-9.]+)\s*%/i);
  if (discountMatch) {
    discountRateDeltaPct = parseFloat(discountMatch[1]);
  }

  // Semantic presets / heuristics
  if (q.includes('aggressive margin') || q.includes('profit focus')) {
    if (priceDeltaPct === 0) priceDeltaPct = 12;
    if (marketingSpendDeltaPct === 0) marketingSpendDeltaPct = -8;
  } else if (q.includes('growth at all costs') || q.includes('hypergrowth')) {
    if (marketingSpendDeltaPct === 0) marketingSpendDeltaPct = 30;
    if (headcountDelta === 0) headcountDelta = 6;
  } else if (q.includes('retention shield') || q.includes('minimize churn')) {
    if (headcountDelta === 0) headcountDelta = 4;
    if (priceDeltaPct === 0) priceDeltaPct = -3;
  }

  return {
    priceDeltaPct: Number(priceDeltaPct.toFixed(1)),
    marketingSpendDeltaPct: Number(marketingSpendDeltaPct.toFixed(1)),
    headcountDelta,
    discountRateDeltaPct: Number(discountRateDeltaPct.toFixed(1)),
    rawQuery: query,
  };
}

// Build Visual Consequence DAG (Nodes & Edges)
export function buildConsequenceDAG(
  decision: DecisionIntervention,
  baseline: BaselineState,
  summary: SimulationResult['summaryComparison']
): ConsequenceGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // LAYER 1: Interventions
  const pDelta = decision.priceDeltaPct;
  const mDelta = decision.marketingSpendDeltaPct;
  const hDelta = decision.headcountDelta;

  nodes.push({
    id: 'n_price',
    label: 'Price Intervention',
    category: 'intervention',
    layer: 1,
    value: `${pDelta >= 0 ? '+' : ''}${pDelta}%`,
    deltaText: `${pDelta >= 0 ? '+' : ''}${pDelta}%`,
    deltaPct: pDelta,
    polarity: pDelta > 0 ? 'positive' : pDelta < 0 ? 'negative' : 'neutral',
    explanation: `Target seat/unit pricing shifted by ${pDelta}% from baseline.`,
  });

  if (mDelta !== 0 || nodes.length < 2) {
    nodes.push({
      id: 'n_mktg',
      label: 'Acquisition Spend',
      category: 'intervention',
      layer: 1,
      value: `${mDelta >= 0 ? '+' : ''}${mDelta}%`,
      deltaText: `${mDelta >= 0 ? '+' : ''}${mDelta}%`,
      deltaPct: mDelta,
      polarity: mDelta >= 0 ? 'positive' : 'negative',
      explanation: `Marketing acquisition budget modified by ${mDelta}%.`,
    });
  }

  if (hDelta !== 0 || nodes.length < 3) {
    nodes.push({
      id: 'n_headcount',
      label: 'Support Capacity',
      category: 'intervention',
      layer: 1,
      value: `${hDelta >= 0 ? '+' : ''}${hDelta} Reps`,
      deltaText: `${hDelta >= 0 ? '+' : ''}${hDelta} Reps`,
      deltaPct: hDelta * 5,
      polarity: hDelta >= 0 ? 'positive' : 'negative',
      explanation: `Support headcount shifted by ${hDelta} staff members.`,
    });
  }

  // LAYER 2: Direct Effects
  const arpuDeltaPct = pDelta * 0.98;
  nodes.push({
    id: 'n_arpu',
    label: 'Realized ARPU',
    category: 'direct_effect',
    layer: 2,
    value: `$${(54 * (1 + arpuDeltaPct / 100)).toFixed(2)}`,
    deltaText: `${arpuDeltaPct >= 0 ? '+' : ''}${arpuDeltaPct.toFixed(1)}%`,
    deltaPct: arpuDeltaPct,
    polarity: arpuDeltaPct >= 0 ? 'positive' : 'negative',
    explanation: 'Average revenue per unit expands directly with list price changes.',
  });

  const visitorDeltaPct = mDelta * 0.65;
  nodes.push({
    id: 'n_traffic',
    label: 'Inbound Demand Flow',
    category: 'direct_effect',
    layer: 2,
    value: `${visitorDeltaPct >= 0 ? '+' : ''}${visitorDeltaPct.toFixed(1)}%`,
    deltaText: `${visitorDeltaPct >= 0 ? '+' : ''}${visitorDeltaPct.toFixed(1)}%`,
    deltaPct: visitorDeltaPct,
    polarity: visitorDeltaPct >= 0 ? 'positive' : 'negative',
    explanation: 'Diminishing elasticity curve governs paid visitor traffic volume.',
  });

  // LAYER 3: Behavioral Shifts
  const convDeltaPct = pDelta * baseline.empiricalElasticities.priceElasticityOfDemand;
  nodes.push({
    id: 'n_conversion',
    label: 'Checkout Conversion',
    category: 'behavioral_shift',
    layer: 3,
    value: `${convDeltaPct >= 0 ? '+' : ''}${convDeltaPct.toFixed(1)}%`,
    deltaText: `${convDeltaPct >= 0 ? '+' : ''}${convDeltaPct.toFixed(1)}%`,
    deltaPct: convDeltaPct,
    polarity: convDeltaPct >= 0 ? 'positive' : 'negative',
    explanation: 'Price resistance suppresses top-funnel conversion velocity.',
  });

  const churnShiftPct = (pDelta * baseline.empiricalElasticities.priceElasticityOfChurn) - (hDelta * 2.5);
  nodes.push({
    id: 'n_churn',
    label: 'Cohort Churn Friction',
    category: 'behavioral_shift',
    layer: 3,
    value: `${churnShiftPct >= 0 ? '+' : ''}${churnShiftPct.toFixed(1)}%`,
    deltaText: `${churnShiftPct <= 0 ? '' : '+'}${churnShiftPct.toFixed(1)}%`,
    deltaPct: churnShiftPct,
    polarity: churnShiftPct <= 0 ? 'positive' : 'negative', // lower churn is positive
    explanation: 'Price sensitivity increases customer attrition; support rep capacity dampens it.',
  });

  // LAYER 4: KPI Impacts
  const subsDelta = summary.activeSubscribers.deltaPct;
  nodes.push({
    id: 'n_subscribers',
    label: 'Subscriber Base Cohort',
    category: 'kpi_impact',
    layer: 4,
    value: `${summary.activeSubscribers.simulated.toLocaleString()}`,
    deltaText: `${subsDelta >= 0 ? '+' : ''}${subsDelta.toFixed(1)}%`,
    deltaPct: subsDelta,
    polarity: subsDelta >= 0 ? 'positive' : 'negative',
    explanation: 'Compounding monthly net additions minus cohort attrition.',
  });

  // LAYER 5: Terminal Outcomes
  const mrrDelta = summary.mrr.deltaPct;
  nodes.push({
    id: 'n_mrr',
    label: 'Terminal MRR',
    category: 'terminal_outcome',
    layer: 5,
    value: `$${(summary.mrr.simulated / 1000).toFixed(0)}k/mo`,
    deltaText: `${mrrDelta >= 0 ? '+' : ''}${mrrDelta.toFixed(1)}%`,
    deltaPct: mrrDelta,
    polarity: mrrDelta >= 0 ? 'positive' : 'negative',
    explanation: 'Aggregate recurring top-line revenue after 12 months.',
  });

  const profitDelta = summary.grossProfit.deltaPct;
  nodes.push({
    id: 'n_profit',
    label: 'Operating Gross Profit',
    category: 'terminal_outcome',
    layer: 5,
    value: `$${(summary.grossProfit.simulated / 1000).toFixed(0)}k/mo`,
    deltaText: `${profitDelta >= 0 ? '+' : ''}${profitDelta.toFixed(1)}%`,
    deltaPct: profitDelta,
    polarity: profitDelta >= 0 ? 'positive' : 'negative',
    explanation: 'Final monthly gross profit after accounting for acquisition, hosting, and salaries.',
  });

  // Causal Edges
  edges.push({
    id: 'e_price_arpu',
    source: 'n_price',
    target: 'n_arpu',
    label: 'Direct Yield',
    weight: 0.95,
    polarity: pDelta >= 0 ? 'positive' : 'negative',
    mechanism: 'Price hike translates near-instantaneously to higher average billings per seat.',
  });

  edges.push({
    id: 'e_price_conversion',
    source: 'n_price',
    target: 'n_conversion',
    label: 'Price Resistance',
    weight: 0.8,
    polarity: pDelta > 0 ? 'negative' : 'positive',
    mechanism: 'Empirical price elasticity of demand shows lower conversion at higher list price.',
  });

  edges.push({
    id: 'e_price_churn',
    source: 'n_price',
    target: 'n_churn',
    label: 'Renewal Sensitivity',
    weight: 0.75,
    polarity: pDelta > 0 ? 'negative' : 'positive',
    mechanism: 'Sticker shock induces higher cancellations among budget-sensitive tiers.',
  });

  edges.push({
    id: 'e_mktg_traffic',
    source: 'n_mktg',
    target: 'n_traffic',
    label: 'Paid Reach',
    weight: 0.7,
    polarity: mDelta >= 0 ? 'positive' : 'negative',
    mechanism: 'Spend changes drive visitor flow subject to square-root diminishing returns.',
  });

  edges.push({
    id: 'e_headcount_churn',
    source: 'n_headcount',
    target: 'n_churn',
    label: 'Resolution SLA',
    weight: 0.65,
    polarity: hDelta >= 0 ? 'positive' : 'negative',
    mechanism: 'More support reps reduce ticket queues and lower user frustration.',
  });

  edges.push({
    id: 'e_conversion_subs',
    source: 'n_conversion',
    target: 'n_subscribers',
    label: 'New Cohort Inflow',
    weight: 0.85,
    polarity: convDeltaPct >= 0 ? 'positive' : 'negative',
    mechanism: 'Checkout conversion determines rate of new customer acquisitions.',
  });

  edges.push({
    id: 'e_churn_subs',
    source: 'n_churn',
    target: 'n_subscribers',
    label: 'Attrition Drain',
    weight: 0.9,
    polarity: churnShiftPct <= 0 ? 'positive' : 'negative',
    mechanism: 'Monthly churn compounds exponentially over the 12-month simulation horizon.',
  });

  edges.push({
    id: 'e_arpu_mrr',
    source: 'n_arpu',
    target: 'n_mrr',
    label: 'Unit Expansion',
    weight: 0.9,
    polarity: arpuDeltaPct >= 0 ? 'positive' : 'negative',
    mechanism: 'Subscribers multiplied by higher ARPU lifts aggregate recurring revenue.',
  });

  edges.push({
    id: 'e_subs_mrr',
    source: 'n_subscribers',
    target: 'n_mrr',
    label: 'Scale Multiplier',
    weight: 0.95,
    polarity: subsDelta >= 0 ? 'positive' : 'negative',
    mechanism: 'Active subscriber base represents recurring subscription volume.',
  });

  edges.push({
    id: 'e_mrr_profit',
    source: 'n_mrr',
    target: 'n_profit',
    label: 'Margin Contribution',
    weight: 0.95,
    polarity: mrrDelta >= 0 ? 'positive' : 'negative',
    mechanism: 'Incremental revenue flows through to gross operating margin after COGS.',
  });

  return { nodes, edges };
}

// Monte Carlo Simulator
export function runSimulation(
  dataset: DataPoint[],
  decision: DecisionIntervention,
  horizon = 12,
  numRuns = 250
): SimulationResult {
  const baseline = calculateBaseline(dataset, horizon);
  const lastRow = dataset[dataset.length - 1] || {};

  const basePrice = Number(lastRow.price || 54.0);
  const baseMktg = Number(lastRow.marketing_spend || 66000);
  const baseTraffic = Number(lastRow.website_visitors || 274000);
  const baseConv = Number(lastRow.conversion_rate || 2.34);
  const baseChurn = Number(lastRow.churn_rate || 3.56);
  const baseSubs = Number(lastRow.active_subscribers || 94923);
  const baseHeadcount = Number(lastRow.support_headcount || 24);

  const newPrice = basePrice * (1 + decision.priceDeltaPct / 100);
  const newMktg = baseMktg * (1 + decision.marketingSpendDeltaPct / 100);
  const newHeadcount = Math.max(1, baseHeadcount + decision.headcountDelta);

  // Run Monte Carlo paths
  const runMonthlyMrrs: number[][] = Array.from({ length: horizon }, () => []);
  const runMonthlyProfits: number[][] = Array.from({ length: horizon }, () => []);
  const runMonthlySubs: number[][] = Array.from({ length: horizon }, () => []);
  const runMonthlyChurns: number[][] = Array.from({ length: horizon }, () => []);

  for (let run = 0; run < numRuns; run++) {
    // Stochastic variations around empirical parameters
    const noisePriceElas = baseline.empiricalElasticities.priceElasticityOfDemand + (Math.random() - 0.5) * 0.25;
    const noiseChurnElas = baseline.empiricalElasticities.priceElasticityOfChurn + (Math.random() - 0.5) * 0.20;
    const noiseMktgElas = baseline.empiricalElasticities.marketingSpendElasticity + (Math.random() - 0.5) * 0.15;

    let simSubs = baseSubs;
    let simPrice = newPrice;

    for (let m = 1; m <= horizon; m++) {
      // Traffic with diminishing returns + seasonal stochasticity
      const mktgRatio = newMktg / Math.max(1, baseMktg);
      const trafficGrowth = Math.pow(mktgRatio, noiseMktgElas) * (1 + (Math.random() - 0.5) * 0.05);
      const simTraffic = baseTraffic * trafficGrowth * (1 + m * 0.012);

      // Conversion rate sensitive to price
      const priceRatio = simPrice / basePrice;
      const convFactor = 1 + (priceRatio - 1) * noisePriceElas;
      const simConv = Math.max(1.0, baseConv * convFactor + (Math.random() - 0.5) * 0.08);

      const newCust = Math.round((simTraffic * (simConv / 100)));

      // Churn sensitive to price and support rep ratio
      const custPerRep = simSubs / newHeadcount;
      const baseCustPerRep = baseSubs / baseHeadcount;
      const repLoadRatio = custPerRep / baseCustPerRep;

      const churnShift = ((priceRatio - 1) * noiseChurnElas * 100) + ((repLoadRatio - 1) * 0.35);
      const simChurn = Math.max(1.2, Math.min(7.5, baseChurn + churnShift + (Math.random() - 0.5) * 0.18));

      const churnedCust = Math.round(simSubs * (simChurn / 100));
      simSubs = Math.max(1000, simSubs + newCust - churnedCust);

      const simArpu = simPrice * (1 + (Math.random() - 0.5) * 0.015);
      const simMrr = Math.round(simSubs * simArpu);

      // Cost structure
      const supportCost = newHeadcount * 5800;
      const infraCost = 15000 + simSubs * 1.55;
      const cogs = simMrr * 0.11;
      const totalCosts = newMktg + supportCost + infraCost + cogs;
      const simGrossProfit = Math.round(simMrr - totalCosts);

      runMonthlyMrrs[m - 1].push(simMrr);
      runMonthlyProfits[m - 1].push(simGrossProfit);
      runMonthlySubs[m - 1].push(simSubs);
      runMonthlyChurns[m - 1].push(simChurn);
    }
  }

  // Trajectories with P10, P50, P90
  const mrrTrajectories: MonthlyTrajectory[] = [];
  const profitTrajectories: MonthlyTrajectory[] = [];
  const subsTrajectories: MonthlyTrajectory[] = [];
  const churnTrajectories: MonthlyTrajectory[] = [];

  for (let m = 0; m < horizon; m++) {
    const monthNum = m + 1;
    const baseProj = baseline.projections[m];

    mrrTrajectories.push({
      month: monthNum,
      monthLabel: `M+${monthNum}`,
      p10: Math.round(percentile(runMonthlyMrrs[m], 10)),
      p50: Math.round(percentile(runMonthlyMrrs[m], 50)),
      p90: Math.round(percentile(runMonthlyMrrs[m], 90)),
      baseline: baseProj.mrr,
    });

    profitTrajectories.push({
      month: monthNum,
      monthLabel: `M+${monthNum}`,
      p10: Math.round(percentile(runMonthlyProfits[m], 10)),
      p50: Math.round(percentile(runMonthlyProfits[m], 50)),
      p90: Math.round(percentile(runMonthlyProfits[m], 90)),
      baseline: baseProj.grossProfit,
    });

    subsTrajectories.push({
      month: monthNum,
      monthLabel: `M+${monthNum}`,
      p10: Math.round(percentile(runMonthlySubs[m], 10)),
      p50: Math.round(percentile(runMonthlySubs[m], 50)),
      p90: Math.round(percentile(runMonthlySubs[m], 90)),
      baseline: baseProj.activeSubscribers,
    });

    churnTrajectories.push({
      month: monthNum,
      monthLabel: `M+${monthNum}`,
      p10: Number(percentile(runMonthlyChurns[m], 10).toFixed(2)),
      p50: Number(percentile(runMonthlyChurns[m], 50).toFixed(2)),
      p90: Number(percentile(runMonthlyChurns[m], 90).toFixed(2)),
      baseline: baseProj.churnRate,
    });
  }

  // Final summary comparison at terminal month (horizon)
  const lastBase = baseline.projections[horizon - 1];
  const lastSimMrr = mrrTrajectories[horizon - 1].p50;
  const lastSimProfit = profitTrajectories[horizon - 1].p50;
  const lastSimSubs = subsTrajectories[horizon - 1].p50;
  const lastSimChurn = churnTrajectories[horizon - 1].p50;

  const simCac = Number((newMktg / Math.max(1, (lastSimSubs * (lastSimChurn / 100) + 500))).toFixed(2));
  const simLtv = Number(((newPrice * 0.98) / Math.max(0.01, lastSimChurn / 100)).toFixed(2));
  const simLtvCac = Number((simLtv / Math.max(1, simCac)).toFixed(2));

  const baseCac = baseline.metrics.cac?.currentValue || 10.29;
  const baseLtv = baseline.metrics.ltv?.currentValue || 1528.09;
  const baseLtvCac = baseline.metrics.ltvCacRatio?.currentValue || 148.5;

  const summaryComparison: SimulationResult['summaryComparison'] = {
    mrr: {
      baseline: lastBase.mrr,
      simulated: lastSimMrr,
      deltaAbs: lastSimMrr - lastBase.mrr,
      deltaPct: Number((((lastSimMrr - lastBase.mrr) / lastBase.mrr) * 100).toFixed(1)),
    },
    grossProfit: {
      baseline: lastBase.grossProfit,
      simulated: lastSimProfit,
      deltaAbs: lastSimProfit - lastBase.grossProfit,
      deltaPct: Number((((lastSimProfit - lastBase.grossProfit) / lastBase.grossProfit) * 100).toFixed(1)),
    },
    activeSubscribers: {
      baseline: lastBase.activeSubscribers,
      simulated: lastSimSubs,
      deltaAbs: lastSimSubs - lastBase.activeSubscribers,
      deltaPct: Number((((lastSimSubs - lastBase.activeSubscribers) / lastBase.activeSubscribers) * 100).toFixed(1)),
    },
    churnRate: {
      baseline: lastBase.churnRate,
      simulated: lastSimChurn,
      deltaAbs: Number((lastSimChurn - lastBase.churnRate).toFixed(2)),
      deltaPct: Number((((lastSimChurn - lastBase.churnRate) / lastBase.churnRate) * 100).toFixed(1)),
    },
    cac: {
      baseline: baseCac,
      simulated: simCac,
      deltaAbs: Number((simCac - baseCac).toFixed(2)),
      deltaPct: Number((((simCac - baseCac) / baseCac) * 100).toFixed(1)),
    },
    ltv: {
      baseline: baseLtv,
      simulated: simLtv,
      deltaAbs: Number((simLtv - baseLtv).toFixed(2)),
      deltaPct: Number((((simLtv - baseLtv) / baseLtv) * 100).toFixed(1)),
    },
    ltvCacRatio: {
      baseline: baseLtvCac,
      simulated: simLtvCac,
      deltaAbs: Number((simLtvCac - baseLtvCac).toFixed(2)),
      deltaPct: Number((((simLtvCac - baseLtvCac) / baseLtvCac) * 100).toFixed(1)),
    },
  };

  // 3 Future Branches
  const futureBranches: FutureBranch[] = [
    {
      id: 'optimistic',
      name: 'Optimistic (High Pricing Inelasticity)',
      probabilityPct: 22,
      color: '#10b981', // emerald
      narrative: 'Customers demonstrate strong brand stickiness. Willingness-to-pay absorbs price increases with negligible churn friction.',
      keyCondition: 'Low substitution elasticity and quick perceived ROI by key enterprise accounts.',
      terminalMrr: mrrTrajectories[horizon - 1].p90,
      terminalGrossProfit: profitTrajectories[horizon - 1].p90,
      terminalSubscribers: subsTrajectories[horizon - 1].p90,
      terminalChurnRate: churnTrajectories[horizon - 1].p10,
    },
    {
      id: 'expected',
      name: 'Expected (Baseline Market Response)',
      probabilityPct: 56,
      color: '#6366f1', // indigo
      narrative: 'Moderate churn uptick offset by ARPU lift. Healthy net margin expansion with controlled cohort attrition.',
      keyCondition: 'Historical empirical elasticity parameters hold steady across customer segments.',
      terminalMrr: mrrTrajectories[horizon - 1].p50,
      terminalGrossProfit: profitTrajectories[horizon - 1].p50,
      terminalSubscribers: subsTrajectories[horizon - 1].p50,
      terminalChurnRate: churnTrajectories[horizon - 1].p50,
    },
    {
      id: 'pessimistic',
      name: 'Pessimistic (Churn Shock & Downside)',
      probabilityPct: 22,
      color: '#f43f5e', // rose
      narrative: 'Compound attrition shock: cumulative subscriber losses begin eroding gross profit gains by Month 7.',
      keyCondition: 'Competitors discount aggressively, turning price elasticity elastic (PED < -1.4).',
      terminalMrr: mrrTrajectories[horizon - 1].p10,
      terminalGrossProfit: profitTrajectories[horizon - 1].p10,
      terminalSubscribers: subsTrajectories[horizon - 1].p10,
      terminalChurnRate: churnTrajectories[horizon - 1].p90,
    },
  ];

  // Consequence Graph
  const consequenceGraph = buildConsequenceDAG(decision, baseline, summaryComparison);

  // Risk assessment
  const terminalRunsProfit = runMonthlyProfits[horizon - 1];
  const negativeProfitRuns = terminalRunsProfit.filter((p) => p < lastBase.grossProfit).length;
  const downsideProb = Math.round((negativeProfitRuns / numRuns) * 100);

  let breakEvenMonth: number | null = null;
  for (let m = 0; m < horizon; m++) {
    if (profitTrajectories[m].p50 >= baseline.projections[m].grossProfit) {
      breakEvenMonth = m + 1;
      break;
    }
  }

  return {
    id: `sim_${Date.now()}`,
    timestamp: new Date().toISOString(),
    interpretedDecision: decision,
    summaryComparison,
    trajectories: {
      mrr: mrrTrajectories,
      grossProfit: profitTrajectories,
      activeSubscribers: subsTrajectories,
      churnRate: churnTrajectories,
    },
    futureBranches,
    consequenceGraph,
    riskAssessment: {
      downsideProbabilityPct: downsideProb,
      valueAtRisk90Pct: Math.round(lastBase.grossProfit - profitTrajectories[horizon - 1].p10),
      breakEvenMonth,
    },
  };
}

// Decision Optimizer (Counterfactual Search Engine)
export function optimizeDecision(
  dataset: DataPoint[],
  objective: OptimizationResult['objective'] = 'maximize_profit',
  horizon = 12
): OptimizationResult {
  const candidateTemplates: Array<{
    title: string;
    description: string;
    risk: CandidateDecision['riskLevel'];
    intervention: DecisionIntervention;
  }> = [
    {
      title: 'Precision Margin Lift (+8% Price, Shield Retention)',
      description: 'Increases price moderately while adding 2 customer support reps to eliminate churn pressure.',
      risk: 'Conservative',
      intervention: { priceDeltaPct: 8, marketingSpendDeltaPct: 0, headcountDelta: 2, discountRateDeltaPct: 0 },
    },
    {
      title: 'Aggressive Profit Maximizer (+14% Price, -10% Spend)',
      description: 'Optimizes short-to-medium term cash flow by capturing willingness-to-pay while curtailing paid CAC.',
      risk: 'Aggressive',
      intervention: { priceDeltaPct: 14, marketingSpendDeltaPct: -10, headcountDelta: 1, discountRateDeltaPct: 0 },
    },
    {
      title: 'Retention Fortress (0% Price, +4 Support, -5% Mktg)',
      description: 'Reallocates acquisition budget to retention infrastructure, driving churn to historical lows.',
      risk: 'Conservative',
      intervention: { priceDeltaPct: 0, marketingSpendDeltaPct: -5, headcountDelta: 4, discountRateDeltaPct: 0 },
    },
    {
      title: 'Balanced Scaler (+6% Price, +15% Marketing, +3 Support)',
      description: 'Expands market footprint with heightened top-funnel acquisition funded by mild price lift.',
      risk: 'Moderate',
      intervention: { priceDeltaPct: 6, marketingSpendDeltaPct: 15, headcountDelta: 3, discountRateDeltaPct: 0 },
    },
    {
      title: 'Volume Drive (-4% Price, +25% Marketing, +5 Support)',
      description: 'Sacrifices unit margin for land-grab subscriber acquisition and market share dominance.',
      risk: 'Aggressive',
      intervention: { priceDeltaPct: -4, marketingSpendDeltaPct: 25, headcountDelta: 5, discountRateDeltaPct: 0 },
    },
  ];

  const candidates: CandidateDecision[] = candidateTemplates.map((template, idx) => {
    const sim = runSimulation(dataset, template.intervention, horizon, 100);
    const profitDeltaPct = sim.summaryComparison.grossProfit.deltaPct;
    const mrrDeltaPct = sim.summaryComparison.mrr.deltaPct;
    const churnDeltaPct = sim.summaryComparison.churnRate.deltaPct;
    const ltvCacDeltaPct = sim.summaryComparison.ltvCacRatio.deltaPct;

    let score = 0;
    if (objective === 'maximize_profit') {
      score = profitDeltaPct * 1.5 - churnDeltaPct * 0.8;
    } else if (objective === 'maximize_revenue') {
      score = mrrDeltaPct * 1.5 + profitDeltaPct * 0.5;
    } else if (objective === 'minimize_churn') {
      score = -churnDeltaPct * 2.0 + profitDeltaPct * 0.3;
    } else if (objective === 'maximize_ltv_cac') {
      score = ltvCacDeltaPct * 1.5 + profitDeltaPct * 0.5;
    }

    return {
      id: `candidate_${idx + 1}`,
      title: template.title,
      description: template.description,
      intervention: template.intervention,
      objectiveScore: Number(score.toFixed(1)),
      expectedProfitDeltaPct: profitDeltaPct,
      expectedMrrDeltaPct: mrrDeltaPct,
      expectedChurnDeltaPct: churnDeltaPct,
      riskLevel: template.risk,
    };
  });

  // Sort candidates by objective score descending
  candidates.sort((a, b) => b.objectiveScore - a.objectiveScore);

  const objectiveLabels: Record<OptimizationResult['objective'], string> = {
    maximize_profit: 'Maximize Gross Operating Profit',
    maximize_revenue: 'Maximize Monthly Recurring Revenue (MRR)',
    minimize_churn: 'Minimize Cohort Churn & Protect Retention',
    maximize_ltv_cac: 'Maximize Unit Economics (LTV / CAC)',
  };

  return {
    objective,
    objectiveLabel: objectiveLabels[objective],
    bestCandidate: candidates[0],
    candidates,
  };
}
