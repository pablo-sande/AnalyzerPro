import type { 
  Node as BabelNode, 
  FunctionDeclaration, 
  ArrowFunctionExpression,
  FunctionExpression
} from '@babel/types';

export interface FunctionMetrics {
  name: string;
  lines: number;
  startLine: number;
  complexity: number;
  type: 'function' | 'arrow' | 'promise' | 'array' | 'hook' | 'callback';
  hasWarning: boolean;
  code: string;
}

export interface FileAnalysis {
  path: string;
  name: string;
  extension: string;
  totalLines: number;
  functions: FunctionMetrics[];
  functionsCount: number;
  complexity: number;
  maxComplexity: number;
  duplicationPercentage: number;
  warningCount: number;
  fileSize: number; // Size in bytes
}

export interface FunctionAnalysis {
  name: string;
  type: FunctionMetrics['type'];
  size: number;
  complexity: number;
  characteristics: string[];
  location: {
    file: string;
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
}

export interface AnalysisResult {
  functions: FunctionAnalysis[];
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    errorCount: number;
    functionsOver50Lines: number;
    functionsOverComplexity10: number;
    averageComplexity: number;
    averageDuplication: number;
  };
}

export interface FunctionContext {
  type: string;
  objectName?: string;
  method?: string;
  location?: {
    file: string;
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
}

export interface NodeInfo {
  type: string;
  parent?: {
    type: string;
    name?: string;
    objectName?: string;
    method?: string;
  };
}

export interface TraverseOptions {
  onFunction?: (node: BabelNode, parent?: NodeInfo['parent']) => void;
  onControlFlow?: (node: BabelNode) => void;
} 