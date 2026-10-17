import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { ECOMMERCE_DATASET_RAW, ECOMMERCE_METADATA, SAAS_DATASET_RAW, SAAS_METADATA } from './src/data/defaultDatasets.ts';
import { calculateBaseline, optimizeDecision, parseNaturalLanguageDecision, runSimulation } from './server/simulationEngine.ts';
import { generateGeminiExplanation } from './server/geminiService.ts';
import { DataPoint, DatasetMetadata, DecisionIntervention, OptimizationResult } from './src/types/index.ts';

dotenv.config();

// In-memory dataset repository
const datasets: Record<string, { metadata: DatasetMetadata; data: DataPoint[] }> = {
  'saas-benchmark': {
    metadata: SAAS_METADATA,
    data: SAAS_DATASET_RAW,
  },
  'ecommerce-benchmark': {
    metadata: ECOMMERCE_METADATA,
    data: ECOMMERCE_DATASET_RAW,
  },
};

let activeDatasetId = 'saas-benchmark';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '20mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      activeDataset: datasets[activeDatasetId]?.metadata.name,
      activeDatasetId,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      uptime: process.uptime(),
    });
  });

  // Get active or selected sample dataset
  app.get('/api/dataset/sample', (req: Request, res: Response) => {
    const id = (req.query.id as string) || activeDatasetId;
    const ds = datasets[id] || datasets['saas-benchmark'];
    activeDatasetId = ds.metadata.id;
    res.json({
      metadata: ds.metadata,
      data: ds.data,
    });
  });

  // Upload custom CSV dataset
  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { name, rows } = req.body;
      if (!Array.isArray(rows) || rows.length < 3) {
        res.status(400).json({ error: 'Uploaded dataset must contain at least 3 rows.' });
        return;
      }

      const id = `custom_${Date.now()}`;
      const sampleRow = rows[0];
      const keys = Object.keys(sampleRow);

      const columns = keys.map((key) => {
        const val = sampleRow[key];
        const isNum = typeof val === 'number' || (!isNaN(Number(val)) && key.toLowerCase() !== 'month' && key.toLowerCase() !== 'date');
        const numValues = isNum ? rows.map((r) => Number(r[key])).filter((v) => !isNaN(v)) : [];
        const isActionable = /price|spend|budget|headcount|discount|reps/i.test(key);
        const isKpi = /mrr|revenue|profit|churn|subscribers|orders|cac|ltv/i.test(key);

        return {
          name: key,
          type: isNum ? ('numeric' as const) : key.toLowerCase().includes('date') || key.toLowerCase().includes('month') ? ('temporal' as const) : ('categorical' as const),
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          isActionableLever: isActionable,
          isTargetKpi: isKpi,
          mean: numValues.length ? Math.round(numValues.reduce((a, b) => a + b, 0) / numValues.length) : undefined,
          min: numValues.length ? Math.min(...numValues) : undefined,
          max: numValues.length ? Math.max(...numValues) : undefined,
        };
      });

      const metadata: DatasetMetadata = {
        id,
        name: name || `Custom Dataset (${rows.length} rows)`,
        type: 'custom',
        rowCount: rows.length,
        timeColumn: keys.find((k) => /month|date|period/i.test(k)) || keys[0],
        startDate: String(rows[0][keys[0]] || ''),
        endDate: String(rows[rows.length - 1][keys[0]] || ''),
        columns,
        description: `User-uploaded tabular dataset with ${rows.length} records and ${columns.length} columns.`,
      };

      datasets[id] = { metadata, data: rows };
      activeDatasetId = id;

      res.json({ metadata, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process dataset' });
    }
  });

  // Baseline endpoint
  app.get('/api/baseline', (req: Request, res: Response) => {
    const dsId = (req.query.datasetId as string) || activeDatasetId;
    const horizon = Number(req.query.horizon) || 12;
    const ds = datasets[dsId] || datasets['saas-benchmark'];
    const baseline = calculateBaseline(ds.data, horizon);
    res.json(baseline);
  });

  // Simulation endpoint
  app.post('/api/simulate', (req: Request, res: Response) => {
    try {
      const { datasetId, query, decision, horizon = 12, numRuns = 250 } = req.body;
      const ds = datasets[datasetId || activeDatasetId] || datasets['saas-benchmark'];

      let targetDecision: DecisionIntervention;
      if (decision && typeof decision.priceDeltaPct === 'number') {
        targetDecision = decision;
      } else if (query) {
        targetDecision = parseNaturalLanguageDecision(query);
      } else {
        targetDecision = {
          priceDeltaPct: 10,
          marketingSpendDeltaPct: -5,
          headcountDelta: 0,
          discountRateDeltaPct: 0,
          rawQuery: 'Default +10% price test',
        };
      }

      const result = runSimulation(ds.data, targetDecision, horizon, numRuns);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Simulation execution failed' });
    }
  });

  // Gemini 3.8 Flash Explanation endpoint
  app.post('/api/explain', async (req: Request, res: Response) => {
    try {
      const { simulation, userContext } = req.body;
      if (!simulation || !simulation.summaryComparison) {
        res.status(400).json({ error: 'Valid simulation result required.' });
        return;
      }

      const explanation = await generateGeminiExplanation(simulation, userContext);
      res.json(explanation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Explanation generation failed' });
    }
  });

  // Counterfactual Optimization endpoint
  app.get('/api/optimize', (req: Request, res: Response) => {
    const dsId = (req.query.datasetId as string) || activeDatasetId;
    const objective = (req.query.objective as OptimizationResult['objective']) || 'maximize_profit';
    const horizon = Number(req.query.horizon) || 12;

    const ds = datasets[dsId] || datasets['saas-benchmark'];
    const optimization = optimizeDecision(ds.data, objective, horizon);
    res.json(optimization);
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Future Echo server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
