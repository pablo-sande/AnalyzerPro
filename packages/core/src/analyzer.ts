import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileAnalysis, FunctionMetrics, FunctionAnalysis, AnalysisResult } from './types';
import type { 
  Node as BabelNode,
  FunctionDeclaration, 
  ArrowFunctionExpression, 
  FunctionExpression,
  VariableDeclarator,
  ObjectProperty,
  ClassMethod,
  AssignmentExpression,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ObjectMethod,
  ClassProperty,
  CallExpression,
  JSXAttribute,
  Identifier,
  StringLiteral,
  NumericLiteral,
  MemberExpression
} from '@babel/types';
import { parseFile, traverse } from './traverser';

interface ParentInfo {
  type: string;
  key?: string;
  value?: string | number;
  method?: string;
  parent?: {
    type: string;
    callee?: {
      name: string;
    };
  };
}

interface NodeInfo {
  type: string;
  key?: string;
  method?: string;
  isOptional?: boolean;
  value?: string;
}

interface TraverseOptions {
  onFunction?: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: NodeInfo) => void;
  onControlFlow?: (node: BabelNode) => void;
}

export class CodeAnalyzer {
  private readonly ARRAY_METHODS = ['map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce'] as const;
  private readonly PROMISE_METHODS = ['then', 'catch', 'finally'] as const;
  private readonly REACT_HOOKS = ['useEffect', 'useCallback', 'useMemo', 'useState', 'useRef', 'useContext'] as const;
  private readonly COMPLEXITY_THRESHOLD = 10;
  private readonly LINES_THRESHOLD = 50;
  private readonly DUPLICATION_THRESHOLD = 0.8;
  private readonly CACHE_SIZE = 1000;

  private readonly FUNCTION_TYPES = {
    METHOD: 'method' as const,
    PROMISE: 'promise' as const,
    ARRAY: 'array' as const,
    HOOK: 'hook' as const,
    CALLBACK: 'callback' as const,
    FUNCTION: 'function' as const
  } as const;

  private complexityCache = new Map<string, number>();
  private fanInCache = new Map<string, number>();
  private fanOutCache = new Map<string, number>();
  private readonly MAX_CACHE_SIZE = 1000;

  private clearCaches() {
    this.complexityCache.clear();
    this.fanInCache.clear();
    this.fanOutCache.clear();
  }

  private generateCacheKey(node: BabelNode): string {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
  }

  private async parseFile(filePath: string): Promise<BabelNode | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return parseFile(content);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return null;
    }
  }

  private analyzeFunction(node: BabelNode, filePath: string): FunctionAnalysis | null {
    if (!node || !('type' in node)) return null;

    // Skip if not a function node
    if (!['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) {
      return null;
    }

    const functionNode = node as FunctionDeclaration | ArrowFunctionExpression | FunctionExpression;
    const functionName = (functionNode as any).id?.name || 'anonymous';
    const functionSize = this.calculateFunctionSize(functionNode);
    const complexity = this.calculateComplexity(functionNode);
    const fanIn = this.calculateFanIn(functionNode, filePath);
    const fanOut = this.calculateFanOut(functionNode, filePath);

    // Analyze function characteristics
    const characteristics = this.analyzeFunctionCharacteristics(functionNode);

    return {
      name: functionName,
      type: this.determineFunctionType(functionNode),
      size: functionSize,
      complexity,
      fanIn,
      fanOut,
      characteristics,
      location: {
        file: filePath,
        start: functionNode.loc?.start,
        end: functionNode.loc?.end
      }
    };
  }

  private analyzeFunctionCharacteristics(node: BabelNode): string[] {
    const characteristics: string[] = [];
    
    // Analyze function properties
    if (node.type === 'ArrowFunctionExpression') {
      characteristics.push('arrow');
    }
    
    if ((node as any).async) {
      characteristics.push('async');
    }
    
    if ((node as any).generator) {
      characteristics.push('generator');
    }

    // Analyze function body
    const body = (node as any).body;
    if (body) {
      // Check for common patterns
      if (this.containsPattern(body, 'await')) {
        characteristics.push('uses-await');
      }
      if (this.containsPattern(body, 'Promise')) {
        characteristics.push('uses-promises');
      }
      if (this.containsPattern(body, 'useState') || this.containsPattern(body, 'useEffect')) {
        characteristics.push('react-hook');
      }
      if (this.containsPattern(body, 'map') || this.containsPattern(body, 'filter')) {
        characteristics.push('array-operation');
      }
    }

    return characteristics;
  }

  private containsPattern(node: BabelNode, pattern: string): boolean {
    let found = false;
    traverse(node, {
      onControlFlow: (node: BabelNode) => {
        if (node.type === 'Identifier' && (node as Identifier).name.includes(pattern)) {
          found = true;
        }
      }
    });
    return found;
  }

  private determineFunctionType(node: BabelNode): string {
    const characteristics = this.analyzeFunctionCharacteristics(node);
    
    // Determine type based on characteristics and context
    if (characteristics.includes('react-hook')) {
      return 'react-hook';
    }
    if (characteristics.includes('async') || characteristics.includes('uses-promises')) {
      return 'async';
    }
    if (characteristics.includes('generator')) {
      return 'generator';
    }
    if (characteristics.includes('arrow')) {
      return 'arrow';
    }
    
    return 'regular';
  }

  private calculateFunctionSize(node: BabelNode): number {
    if (!node.loc) return 0;
    return node.loc.end.line - node.loc.start.line + 1;
  }

  private calculateComplexity(node: BabelNode): number {
    const cacheKey = this.generateCacheKey(node);
    if (this.complexityCache.has(cacheKey)) {
      return this.complexityCache.get(cacheKey)!;
    }

    let complexity = 1;

    traverse(node, {
      onControlFlow: (node: BabelNode) => {
        if (['IfStatement', 'SwitchCase', 'ForStatement', 'WhileStatement', 
             'DoWhileStatement', 'CatchClause', 'ConditionalExpression'].includes(node.type)) {
          complexity++;
        }
      }
    });

    if (this.complexityCache.size >= this.MAX_CACHE_SIZE) {
      this.complexityCache.clear();
    }
    this.complexityCache.set(cacheKey, complexity);
    return complexity;
  }

  private calculateFanIn(node: BabelNode, filePath: string): number {
    const cacheKey = this.generateCacheKey(node);
    if (this.fanInCache.has(cacheKey)) {
      return this.fanInCache.get(cacheKey)!;
    }

    let fanIn = 0;
    const functionName = (node as any).id?.name;

    if (functionName) {
      traverse(node, {
        onControlFlow: (node: BabelNode) => {
          if (node.type === 'Identifier' && (node as Identifier).name === functionName) {
            fanIn++;
          }
        }
      });
    }

    if (this.fanInCache.size >= this.MAX_CACHE_SIZE) {
      this.fanInCache.clear();
    }
    this.fanInCache.set(cacheKey, fanIn);
    return fanIn;
  }

  private calculateFanOut(node: BabelNode, filePath: string): number {
    const cacheKey = this.generateCacheKey(node);
    if (this.fanOutCache.has(cacheKey)) {
      return this.fanOutCache.get(cacheKey)!;
    }

    let fanOut = 0;
    traverse(node, {
      onControlFlow: (node: BabelNode) => {
        if (node.type === 'CallExpression') {
          fanOut++;
        }
      }
    });

    if (this.fanOutCache.size >= this.MAX_CACHE_SIZE) {
      this.fanOutCache.clear();
    }
    this.fanOutCache.set(cacheKey, fanOut);
    return fanOut;
  }

  async analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    const files = await this.findFiles(repoPath);
    const functions: FunctionAnalysis[] = [];
    const fileAnalyses: FileAnalysis[] = [];

    for (const file of files) {
      try {
        const fileAnalysis = await this.analyzeFile(file);
        if (fileAnalysis) {
          fileAnalyses.push(fileAnalysis);
          functions.push(...fileAnalysis.functions.map(f => ({
            name: f.name,
            type: f.type,
            size: f.lines,
            complexity: f.complexity,
            fanIn: f.fanIn,
            fanOut: f.fanOut,
            characteristics: [],
            location: {
              file: fileAnalysis.path,
              start: { line: f.startLine, column: 0 },
              end: { line: f.startLine + f.lines, column: 0 }
            }
          })));
        }
      } catch (error) {
        console.error(`Error analyzing file ${file}:`, error);
      }
    }

    return {
      functions,
      files: fileAnalyses,
      summary: {
        totalFiles: fileAnalyses.length,
        totalLines: fileAnalyses.reduce((sum, file) => sum + file.totalLines, 0),
        totalFunctions: functions.length,
        errorCount: 0,
        functionsOver50Lines: functions.filter(f => f.size > 50).length,
        functionsOverComplexity10: functions.filter(f => f.complexity > 10).length,
        averageComplexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        averageDuplication: fileAnalyses.reduce((sum, file) => sum + file.duplicationPercentage, 0) / fileAnalyses.length || 0
      }
    };
  }

  private async findFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];
    const processDirectory = async (dirPath: string) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await processDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error);
      }
    };

    await processDirectory(repoPath);
    return files;
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const ast = await this.parseFile(filePath);
      if (!ast) return null;

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter((line: string) => line.trim().length > 0).length;
      const functions: FunctionMetrics[] = [];

      traverse(ast, {
        onFunction: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression) => {
          const analysis = this.analyzeFunction(node, filePath);
          if (analysis) {
            functions.push({
              name: analysis.name,
              lines: analysis.size,
              startLine: analysis.location.start?.line || 0,
              complexity: analysis.complexity,
              fanIn: analysis.fanIn,
              fanOut: analysis.fanOut,
              type: analysis.type as any,
              hasWarning: analysis.size > 50 || analysis.complexity > 10
            });
          }
        }
      });

      const stats = await fs.stat(filePath);

      return {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        totalLines: lines,
        functions,
        functionsCount: functions.length,
        complexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        maxComplexity: Math.max(...functions.map(f => f.complexity), 0),
        averageFanIn: functions.reduce((sum, f) => sum + f.fanIn, 0) / functions.length || 0,
        averageFanOut: functions.reduce((sum, f) => sum + f.fanOut, 0) / functions.length || 0,
        duplicationPercentage: functions.filter(f => f.fanIn > 1).length / functions.length * 100 || 0,
        warningCount: functions.filter(f => f.hasWarning).length,
        fileSize: stats.size
      };
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }
} 