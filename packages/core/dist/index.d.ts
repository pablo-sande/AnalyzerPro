import * as _babel_types from '@babel/types';
import { FunctionDeclaration, ArrowFunctionExpression, FunctionExpression, Node } from '@babel/types';
import * as _babel_parser from '@babel/parser';

interface FunctionMetrics {
    name: string;
    lines: number;
    startLine: number;
    complexity: number;
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
    duplicationPercentage: number;
    warningCount: number;
    fileSize: number;
}
interface FunctionAnalysis {
    name: string;
    type: string;
    size: number;
    complexity: number;
    characteristics: string[];
    location: {
        file: string;
        start?: {
            line: number;
            column: number;
        };
        end?: {
            line: number;
            column: number;
        };
    };
}
interface AnalysisResult {
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
interface NodeInfo$1 {
    node: Node;
    parent?: {
        type: string;
        key?: string;
        value?: string;
        method?: string;
        isOptional?: boolean;
    };
}
interface TraverseOptions$1 {
    onFunction?: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: NodeInfo$1['parent']) => void;
    onControlFlow?: (node: Node) => void;
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
    private readonly MAX_CACHE_SIZE;
    private clearCaches;
    private generateCacheKey;
    private parseFile;
    private analyzeFunction;
    private analyzeFunctionCharacteristics;
    private containsPattern;
    private determineFunctionType;
    private calculateFunctionSize;
    private calculateComplexity;
    analyzeRepo(repoPath: string): Promise<AnalysisResult>;
    private findFiles;
    private analyzeFile;
}

interface NodeInfo {
    node: Node;
    parent?: {
        type: string;
        key?: string;
        value?: string;
        method?: string;
        isOptional?: boolean;
    };
}
interface TraverseOptions {
    onFunction?: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: NodeInfo['parent']) => void;
    onControlFlow?: (node: Node) => void;
}
declare function traverse(node: Node, options: TraverseOptions, parent?: Node): void;
declare function calculateComplexity(node: Node): number;
declare function parseFile(content: string): _babel_parser.ParseResult<_babel_types.File>;

export { type AnalysisResult, CodeAnalyzer, type FileAnalysis, type FunctionAnalysis, type FunctionMetrics, type NodeInfo$1 as NodeInfo, type TraverseOptions$1 as TraverseOptions, calculateComplexity, parseFile, traverse };
