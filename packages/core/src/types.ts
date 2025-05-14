export interface FunctionMetrics {
  name: string;
  lines: number;
  startLine: number;
  complexity: number;
  fanIn: number;
  fanOut: number;
  type: 'function' | 'method' | 'promise' | 'array' | 'hook' | 'callback';
  hasWarning: boolean;
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
  averageFanIn: number;
  averageFanOut: number;
  duplicationPercentage: number;
  warningCount: number;
  fileSize: number; // Size in bytes
}

export interface AnalysisResult {
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    totalLines: number;
    functionsOver50Lines: number;
    functionsOverComplexity10: number;
    averageComplexity: number;
    averageDuplication: number;
  };
} 