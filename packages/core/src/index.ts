// Export types
export type {
  AnalysisResult,
  FileAnalysis,
  FunctionAnalysis,
  FunctionMetrics,
  TraverseOptions,
  NodeInfo,
  FunctionContext
} from './types.js';

// Export main classes/functions
export { traverse, parseFile } from './traverser.js';
export { CodeAnalyzer } from './analyzer.js';
export { ContextualNamingSystem } from './contextual-naming-system.js';
export { getParentInfo } from './parent-info.js';
export { FunctionAnalyzer } from './function-analyzer.js';
export { DuplicationDetector } from './duplication-detector.js';