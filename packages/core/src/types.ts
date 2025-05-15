import { FunctionDeclaration, ArrowFunctionExpression, FunctionExpression, Node } from '@babel/types';

export interface FunctionMetrics {
  name: string;
  lines: number;
  startLine: number;
  complexity: number;
  type: 'function' | 'method' | 'promise' | 'array' | 'hook' | 'callback';
  hasWarning: boolean;
  code?: string; // Optional since we only need it for duplication detection
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
  type: string;
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

export interface NodeInfo {
  node: Node;
  parent?: {
    type: string;
    key?: string;
    value?: string;
    method?: string;
    isOptional?: boolean;
  };
}

export interface TraverseOptions {
  onFunction?: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: NodeInfo['parent']) => void;
  onControlFlow?: (node: Node) => void;
} 