interface FunctionMetrics {
    name: string;
    lines: number;
    startLine: number;
    complexity: number;
    fanIn: number;
    fanOut: number;
    type: 'function' | 'method' | 'promise' | 'array' | 'hook' | 'callback';
    hasWarning: boolean;
}
interface FileAnalysis {
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
    fileSize: number;
}
interface AnalysisResult {
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

declare class CodeAnalyzer {
    private readonly ARRAY_METHODS;
    private readonly PROMISE_METHODS;
    private readonly REACT_HOOKS;
    private readonly COMPLEXITY_THRESHOLD;
    private readonly LINES_THRESHOLD;
    private readonly DUPLICATION_THRESHOLD;
    private readonly CACHE_SIZE;
    private readonly FUNCTION_TYPES;
    private complexityCache;
    private fanInCache;
    private fanOutCache;
    private clearCaches;
    private getCacheKey;
    parseFile(filePath: string): Promise<FileAnalysis>;
    private calculateFanIn;
    private calculateFanOut;
    private hasReferenceToNode;
    private isNodeInsideFunction;
    private calculateFunctionDuplication;
    analyzeRepo(repoPath: string): Promise<AnalysisResult>;
}

export { type AnalysisResult, CodeAnalyzer, type FileAnalysis, type FunctionMetrics };
