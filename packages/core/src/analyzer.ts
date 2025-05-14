import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, FileAnalysis, FunctionMetrics } from './types.js';
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
import { parseFile, traverse, calculateComplexity } from './traverser.js';

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

  private complexityCache: Map<string, number> = new Map();
  private fanInCache: Map<string, number> = new Map();
  private fanOutCache: Map<string, number> = new Map();

  private clearCaches() {
    this.complexityCache.clear();
    this.fanInCache.clear();
    this.fanOutCache.clear();
  }

  private getCacheKey(node: BabelNode): string {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
  }

  public async parseFile(filePath: string): Promise<FileAnalysis> {
    this.clearCaches();
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const ast = parseFile(content);  

    const functions: FunctionMetrics[] = [];
    let totalLines = content.split('\n').length;
    let totalComplexity = 0;
    let maxComplexity = 0;
    let totalFanIn = 0;
    let totalFanOut = 0;
    let totalWarnings = 0;
    let totalDuplication = 0;

    traverse(ast, {
      onFunction: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: ParentInfo) => {
        let functionName = 'anonymous';
        let functionType: FunctionMetrics['type'] = this.FUNCTION_TYPES.FUNCTION;

        // Si es una función nombrada, usar ese nombre
        if ('id' in node && node.id) {
          functionName = node.id.name;
        }
        // Si es un método de clase o propiedad de objeto
        else if (parent && (parent.type === 'ClassMethod' || parent.type === 'ObjectProperty')) {
          functionName = parent.key || 'anonymous';
          functionType = this.FUNCTION_TYPES.METHOD;
        }
        // Si es una declaración de variable
        else if (parent && parent.type === 'VariableDeclarator') {
          functionName = parent.key || 'anonymous';
        }
        // Si es un callback en un CallExpression
        else if (parent && parent.type === 'CallExpression') {
          // Verificar si es un hook de React
          const findClosestHook = (node: any): string | null => {
            if (!node) return null;
            
            // Verificar si el nodo actual es una llamada a un hook
            if (node.type === 'CallExpression' && 
                node.callee?.type === 'Identifier' && 
                this.REACT_HOOKS.includes(node.callee.name)) {
              return node.callee.name;
            }
            
            // Verificar si el nodo es un argumento de un hook
            if (node.parent?.type === 'CallExpression' && 
                node.parent.callee?.type === 'Identifier' && 
                this.REACT_HOOKS.includes(node.parent.callee.name)) {
              return node.parent.callee.name;
            }
            
            return findClosestHook(node.parent);
          };

          const hookName = findClosestHook(node);
          if (hookName) {
            functionName = `${hookName} callback`;
            functionType = this.FUNCTION_TYPES.HOOK;
          }
          else if (parent.method) {
            if (this.PROMISE_METHODS.includes(parent.method as typeof this.PROMISE_METHODS[number])) {
              functionName = `${parent.method} handler`;
              functionType = this.FUNCTION_TYPES.PROMISE;
            }
            else if (this.ARRAY_METHODS.includes(parent.method as typeof this.ARRAY_METHODS[number])) {
              functionName = `${parent.method} callback`;
              functionType = this.FUNCTION_TYPES.ARRAY;
            }
            else {
              functionName = `${parent.method} callback`;
              functionType = this.FUNCTION_TYPES.CALLBACK;
            }
          }
          else if (parent.key) {
            functionName = `${parent.key} callback`;
            functionType = this.FUNCTION_TYPES.CALLBACK;
          }
          else {
            functionName = 'anonymous callback';
            functionType = this.FUNCTION_TYPES.CALLBACK;
          }
        }

        // Calcular métricas con caché
        const cacheKey = this.getCacheKey(node);
        let complexity = this.complexityCache.get(cacheKey);
        if (complexity === undefined) {
          complexity = calculateComplexity(node);
          this.complexityCache.set(cacheKey, complexity);
        }

        const lines = node.loc ? node.loc.end.line - node.loc.start.line + 1 : 0;
        const startLine = node.loc ? node.loc.start.line : 0;

        // Actualizar métricas globales
        totalComplexity += complexity;
        maxComplexity = Math.max(maxComplexity, complexity);

        // Calcular fan-in y fan-out con caché
        let fanIn = this.fanInCache.get(cacheKey);
        if (fanIn === undefined) {
          fanIn = this.calculateFanIn(node, ast);
          this.fanInCache.set(cacheKey, fanIn);
        }

        let fanOut = this.fanOutCache.get(cacheKey);
        if (fanOut === undefined) {
          fanOut = this.calculateFanOut(node, ast);
          this.fanOutCache.set(cacheKey, fanOut);
        }

        totalFanIn += fanIn;
        totalFanOut += fanOut;

        // Detectar warnings
        const hasWarning = lines > this.LINES_THRESHOLD || complexity > this.COMPLEXITY_THRESHOLD;
        if (hasWarning) {
          totalWarnings++;
        }

        // Calcular duplicación para esta función
        const functionContent = content.split('\n')
          .slice(
            (node.loc?.start.line || 1) - 1,
            node.loc?.end.line || 1
          )
          .join('\n');
        const duplication = this.calculateFunctionDuplication(functionContent);
        totalDuplication += duplication;

        const functionInfo = {
          name: functionName,
          lines,
          startLine,
          complexity,
          fanIn,
          fanOut,
          type: functionType,
          hasWarning,
          duplication
        };

        functions.push(functionInfo);

      },
    });



    // Get file stats for file size
    const stats = await fs.promises.stat(filePath);

    // Calculate average complexity for the file
    const complexity = functions.length > 0 ? totalComplexity / functions.length : 0;
    const duplicationPercentage = functions.length > 0 ? totalDuplication / functions.length : 0;

    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath),
      totalLines,
      functions,
      functionsCount: functions.length,
      complexity,
      maxComplexity,
      averageFanIn: functions.length > 0 ? totalFanIn / functions.length : 0,
      averageFanOut: functions.length > 0 ? totalFanOut / functions.length : 0,
      duplicationPercentage,
      warningCount: totalWarnings,
      fileSize: stats.size
    };
  }

  private calculateFanIn(node: BabelNode, ast: BabelNode): number {
    // Implementación simplificada: contar referencias a la función
    let fanIn = 0;
    traverse(ast, {
      onFunction: (funcNode) => {
        if (funcNode !== node && this.hasReferenceToNode(funcNode, node)) {
          fanIn++;
        }
      }
    });
    return fanIn;
  }

  private calculateFanOut(node: BabelNode, ast: BabelNode): number {
    // Implementación simplificada: contar llamadas a otras funciones
    let fanOut = 0;
    traverse(ast, {
      onControlFlow: (controlNode) => {
        if (this.isNodeInsideFunction(controlNode, node) && 
            controlNode.type === 'CallExpression') {
          fanOut++;
        }
      }
    });
    return fanOut;
  }

  private hasReferenceToNode(node: BabelNode, targetNode: BabelNode): boolean {
    // Implementación simplificada: verificar si el nodo hace referencia al nodo objetivo
    if (!node || !targetNode) return false;
    
    if (node.type === 'CallExpression' && 
        (node as any).callee?.type === 'Identifier' &&
        (node as any).callee?.name === (targetNode as any).id?.name) {
      return true;
    }

    return false;
  }

  private isNodeInsideFunction(node: BabelNode, functionNode: BabelNode): boolean {
    // Implementación simplificada: verificar si el nodo está dentro de la función
    if (!node.loc || !functionNode.loc) return false;
    
    return node.loc.start.line >= functionNode.loc.start.line &&
           node.loc.end.line <= functionNode.loc.end.line;
  }

  private calculateFunctionDuplication(content: string): number {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*'));

    if (lines.length === 0) return 0;

    const uniqueLines = new Set(lines);
    return (lines.length - uniqueLines.size) / lines.length;
  }

  public async analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    const files: FileAnalysis[] = [];
    const jsExtensions = ['.js', '.jsx', '.ts', '.tsx'];

    const processDirectory = async (dirPath: string) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
          await processDirectory(fullPath);
        } else if (entry.isFile() && jsExtensions.includes(path.extname(entry.name)) && !entry.name.includes('dist') && !entry.name.includes('build') && !entry.name.includes('_astro') && !entry.name.includes('mocks')) {
          try {
            const analysis = await this.parseFile(fullPath);
            files.push(analysis);
          } catch (error) {
            console.error(`Error analyzing ${fullPath}:`, error);
          }
        }
      }
    };

    await processDirectory(repoPath);

    const summary = {
      totalFiles: files.length,
      totalLines: files.reduce((sum, file) => sum + file.totalLines, 0),
      functionsOver50Lines: files.reduce((sum, file) => 
        sum + file.functions.filter((f: FunctionMetrics) => f.lines > 50).length, 0),
      functionsOverComplexity10: files.reduce((sum, file) => 
        sum + file.functions.filter((f: FunctionMetrics) => f.complexity > 10).length, 0),
      averageComplexity: files.reduce((sum, file) => 
        sum + file.functions.reduce((fSum: number, f: FunctionMetrics) => fSum + f.complexity, 0), 0) / 
        files.reduce((sum, file) => sum + file.functions.length, 0),
      averageDuplication: files.reduce((sum, file) => 
        sum + file.duplicationPercentage, 0) / files.length,
    };

    return { files, summary };
  }
} 