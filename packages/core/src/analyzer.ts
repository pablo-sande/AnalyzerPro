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

export class CodeAnalyzer {
  private readonly COMPLEXITY_THRESHOLD = 10;
  private readonly LINES_THRESHOLD = 50;
  private readonly SIMILARITY_THRESHOLD = 0.9; // Lower threshold to catch more potential duplications
  private readonly MIN_CODE_LENGTH = 20; // Minimum characters to consider for duplication

  private readonly FUNCTION_TYPES = {
    METHOD: 'method' as const,
    PROMISE: 'promise' as const,
    ARRAY: 'array' as const,
    HOOK: 'hook' as const,
    CALLBACK: 'callback' as const,
    FUNCTION: 'function' as const
  } as const;

  private complexityCache = new Map<string, number>();
  private readonly MAX_CACHE_SIZE = 1000;
  private repoRoot: string = '';

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
    
    // Calculate complexity by traversing the function body
    let complexity = 1; // Base complexity
    traverse(functionNode, {
      onControlFlow: (node: BabelNode) => {
        if (['IfStatement', 'SwitchCase', 'ForStatement', 'WhileStatement', 
             'DoWhileStatement', 'CatchClause', 'ConditionalExpression',
             'ForInStatement', 'ForOfStatement', 'LogicalExpression'].includes(node.type)) {
          complexity++;
        }
      }
    });

    // Analyze function characteristics
    const characteristics = this.analyzeFunctionCharacteristics(functionNode);

    return {
      name: functionName,
      type: this.determineFunctionType(functionNode),
      size: functionSize,
      complexity,
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
             'DoWhileStatement', 'CatchClause', 'ConditionalExpression',
             'ForInStatement', 'ForOfStatement', 'LogicalExpression'].includes(node.type)) {
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

  private normalizeCode(code: string): string {
    // Remove HTML tags and normalize whitespace
    return code
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private findDuplicatedCode(functions: FunctionMetrics[]): number {
    // Get all lines from all functions
    const allLines = functions.flatMap(f => {
      if (!f.code) return [];
      return f.code.split('\n')
        .map(line => this.normalizeCode(line))
        .filter(line => line.length > 5); // Only keep lines with more than 5 characters
    });

    // Count occurrences of each line
    const lineCounts = new Map<string, number>();
    allLines.forEach(line => {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    });

    // Count duplicated lines (lines that appear more than once)
    let duplicatedLines = 0;
    lineCounts.forEach((count, line) => {
      if (count > 1) {
        duplicatedLines += count - 1; // Count only the duplicates, not the original
      }
    });

    return duplicatedLines;
  }

  async analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    this.repoRoot = repoPath;
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
        functionsOver50Lines: functions.filter(f => f.size > this.LINES_THRESHOLD).length,
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

  public async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const ast = await this.parseFile(filePath);
      if (!ast) return null;

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      const functions: FunctionMetrics[] = [];

      traverse(ast, {
        onFunction: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression) => {
          const analysis = this.analyzeFunction(node, filePath);
          if (analysis) {
            const startLine = analysis.location.start?.line || 0;
            const endLine = analysis.location.end?.line || 0;
            const functionCode = lines.slice(startLine - 1, endLine).join('\n');
            
            functions.push({
              name: analysis.name,
              lines: analysis.size,
              startLine: startLine,
              complexity: analysis.complexity,
              type: analysis.type as any,
              hasWarning: analysis.size > this.LINES_THRESHOLD || analysis.complexity > this.COMPLEXITY_THRESHOLD,
              code: functionCode
            });
          }
        }
      });

      const stats = await fs.stat(filePath);
      const totalLines = functions.reduce((sum, f) => sum + f.lines, 0);
      const duplicatedLines = this.findDuplicatedCode(functions);

      // Get the relative path from the repository root
      const relativePath = path.relative(this.repoRoot, filePath);

      return {
        path: relativePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        totalLines: lines.length,
        functions,
        functionsCount: functions.length,
        complexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        maxComplexity: Math.max(...functions.map(f => f.complexity), 0),
        duplicationPercentage: totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0,
        warningCount: functions.filter(f => f.hasWarning).length,
        fileSize: stats.size
      };
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }
} 