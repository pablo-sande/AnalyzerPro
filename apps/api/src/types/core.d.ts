declare module '@code-analyzer-pro/core' {
  export interface FunctionMetrics {
    name: string;
    lines: number;
    startLine: number;
    complexity: number;
    fanIn: number;
    fanOut: number;
  }

  export interface FileAnalysis {
    path: string;
    name: string;
    extension: string;
    totalLines: number;
    functions: Array<{
      name: string;
      lines: number;
      startLine: number;
      complexity: number;
      fanIn: number;
      fanOut: number;
      type: string;
      hasWarning: boolean;
    }>;
    functionsCount: number;
    complexity: number;
    maxComplexity: number;
    averageFanIn: number;
    averageFanOut: number;
    duplicationPercentage: number;
    warningCount: number;
    fileSize: number;
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

  export class CodeAnalyzer {
    public parseFile(filePath: string): Promise<FileAnalysis>;
    public analyzeRepo(repoPath: string): Promise<AnalysisResult>;
  }
} 