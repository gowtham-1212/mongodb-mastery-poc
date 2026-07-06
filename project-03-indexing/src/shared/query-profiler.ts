import type { Db } from 'mongodb';

export interface ExecutionStages {
  stage: string;
  nReturned: number;
  executionTimeMillis: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  inputStage?: ExecutionStages;
  executionStages?: ExecutionStages;
}

export interface ExecutionStats {
  executionStages: ExecutionStages;
  executionSuccess: boolean;
  nReturned: number;
  executionTimeMillis: number;
  totalKeysExamined: number;
  totalDocsExamined: number;
}

export interface QueryProfile<T> {
  description: string;
  durationMs: number;
  result: T;
  stats: {
    stage: string;
    nReturned: number;
    executionTimeMillis: number;
    totalDocsExamined: number;
    totalKeysExamined: number;
    isScanType: 'COLLSCAN' | 'IXSCAN' | 'FETCH' | 'UNKNOWN';
    efficiency: {
      docsScannedPerDocReturned: number;
      keysScannedPerDocReturned: number;
    };
  };
}

function extractStageInfo(
  executionStages: any,
  executionStats: any,
): {
  stage: string;
  nReturned: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  executionTimeMillis: number;
} {
  // Try to get stage from inputStage first (for indexes with FETCH)
  const stage =
    executionStages?.inputStage?.stage ||
    executionStages?.stage ||
    'UNKNOWN';

  // Get metrics from executionStats (top level), fallback to executionStages
  const nReturned = executionStats?.nReturned || executionStages?.nReturned || 0;

  const totalDocsExamined =
    executionStats?.totalDocsExamined ||
    executionStages?.totalDocsExamined ||
    executionStages?.inputStage?.totalDocsExamined ||
    0;

  const totalKeysExamined =
    executionStats?.totalKeysExamined ||
    executionStages?.totalKeysExamined ||
    executionStages?.inputStage?.totalKeysExamined ||
    0;

  const executionTimeMillis =
    executionStats?.executionTimeMillis || executionStages?.executionTimeMillis || 0;

  return {
    stage,
    nReturned,
    totalDocsExamined,
    totalKeysExamined,
    executionTimeMillis,
  };
}

export async function profileQuery<T>(
  description: string,
  collection: any,
  query: any,
  fn: () => Promise<T>,
): Promise<QueryProfile<T>> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  // Get execution stats using explain
  const explainResult = await collection.find(query).explain('executionStats');

  const executionStages = explainResult.executionStats.executionStages;
  const executionStats = explainResult.executionStats;

  const { stage, nReturned, totalDocsExamined, totalKeysExamined, executionTimeMillis } =
    extractStageInfo(executionStages, executionStats);

  // Determine scan type
  let isScanType: 'COLLSCAN' | 'IXSCAN' | 'FETCH' | 'UNKNOWN' = 'UNKNOWN';
  if (stage.includes('COLLSCAN')) {
    isScanType = 'COLLSCAN'; // Full collection scan (no index)
  } else if (stage.includes('IXSCAN')) {
    isScanType = 'IXSCAN'; // Index scan (using index)
  } else if (stage.includes('FETCH')) {
    isScanType = 'FETCH'; // Index + fetch
  }

  // Calculate efficiency metrics
  const docsScannedPerDocReturned = nReturned > 0 ? totalDocsExamined / nReturned : 0;
  const keysScannedPerDocReturned = nReturned > 0 ? totalKeysExamined / nReturned : 0;

  return {
    description,
    durationMs,
    result,
    stats: {
      stage,
      nReturned,
      executionTimeMillis,
      totalDocsExamined,
      totalKeysExamined,
      isScanType,
      efficiency: {
        docsScannedPerDocReturned,
        keysScannedPerDocReturned,
      },
    },
  };
}