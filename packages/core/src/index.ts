// Export types
export type {
  AnalysisResult,
  FileAnalysis,
  FunctionAnalysis,
  FunctionMetrics,
  TraverseOptions,
  NodeInfo
} from './types';

// Export main classes/functions
export { CodeAnalyzer } from './analyzer';
export { traverse, calculateComplexity, parseFile } from './traverser';