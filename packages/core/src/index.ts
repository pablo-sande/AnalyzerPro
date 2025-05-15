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
export { traverse, parseFile } from './traverser';
export { CodeAnalyzer } from './analyzer';