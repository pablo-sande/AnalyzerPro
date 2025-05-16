import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileAnalysis, FunctionMetrics, FunctionAnalysis, AnalysisResult } from './types';
import type { 
  Node as BabelNode,
  FunctionDeclaration, 
  ArrowFunctionExpression, 
  FunctionExpression,
  Identifier
} from '@babel/types';
import { parseFile, traverse } from './traverser.js';

export class CodeAnalyzer {
  private readonly COMPLEXITY_THRESHOLD = 10;
  private readonly LINES_THRESHOLD = 50;
  private readonly BATCH_SIZE = 100;
  private repoRoot: string = '';

  constructor() {}

  public async analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    this.repoRoot = repoPath;
    const files = await this.findFiles(repoPath);
    const fileAnalyses: (FileAnalysis | null)[] = [];
    const functions: FunctionAnalysis[] = [];

    // Process files in batches to manage memory
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batch = files.slice(i, i + this.BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(file => this.analyzeFile(file))
      );
      
      for (const fileAnalysis of batchResults) {
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
      }
    }

    return {
      functions,
      files: fileAnalyses.filter((f): f is FileAnalysis => f !== null),
      summary: {
        totalFiles: fileAnalyses.filter(f => f !== null).length,
        totalLines: fileAnalyses.reduce((sum, file) => sum + (file?.totalLines || 0), 0),
        totalFunctions: functions.length,
        errorCount: 0,
        functionsOver50Lines: functions.filter(f => f.size > this.LINES_THRESHOLD).length,
        functionsOverComplexity10: functions.filter(f => f.complexity > 10).length,
        averageComplexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        averageDuplication: fileAnalyses.reduce((sum, file) => sum + (file?.duplicationPercentage || 0), 0) / fileAnalyses.length || 0
      }
    };
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
              type: analysis.type as FunctionMetrics['type'],
              hasWarning: analysis.size > this.LINES_THRESHOLD || analysis.complexity > this.COMPLEXITY_THRESHOLD,
              code: functionCode
            });
          }
        }
      });

      const stats = await fs.stat(filePath);
      const totalLines = functions.reduce((sum, f) => sum + f.lines, 0);
      const duplicatedLines = this.findDuplicatedCode(functions, totalLines);
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

  private analyzeFunction(node: BabelNode, filePath: string): FunctionAnalysis | null {
    if (!node || !('type' in node)) return null;

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

  private calculateFunctionSize(node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression): number {
    if (!node.loc) return 0;
    return node.loc.end.line - node.loc.start.line + 1;
  }

  private determineFunctionType(node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression): FunctionMetrics['type'] {
    if (node.type === 'ArrowFunctionExpression') return 'arrow';
    if (node.async) return 'promise';
    if (node.generator) return 'array';
    return 'function';
  }

  private analyzeFunctionCharacteristics(node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression): string[] {
    const characteristics: string[] = [];
    
    if (node.async) characteristics.push('async');
    if (node.generator) characteristics.push('generator');
    
    traverse(node, {
      onControlFlow: (node: BabelNode) => {
        if (node.type === 'TryStatement') characteristics.push('try-catch');
        if (node.type === 'ForOfStatement') characteristics.push('for-of');
        if (node.type === 'ForInStatement') characteristics.push('for-in');
      }
    });

    return characteristics;
  }

  private findDuplicatedCode(functions: FunctionMetrics[], totalFileLines: number): number {
    const codeMap = new Map<string, { count: number, lines: number, indexes: number[][], level: number }>();
    const SIMILARITY_THRESHOLD = 0.8;
    const MAX_CODE_LENGTH = 1000;
    const duplicatedLineFlags = new Array(totalFileLines).fill(false);

    // Sort functions by level (outermost first)
    const sortedFunctions = [...functions].sort((a, b) => {
      // If a function is contained within another, the containing one goes first
      if (a.startLine <= b.startLine && a.startLine + a.lines >= b.startLine + b.lines) return -1;
      if (b.startLine <= a.startLine && b.startLine + b.lines >= a.startLine + a.lines) return 1;
      return a.startLine - b.startLine;
    });

    // Group functions by level
    const levelGroups = new Map<number, FunctionMetrics[]>();
    for (const func of sortedFunctions) {
      if (!func.code) continue;
      
      // Determine function level
      let level = 0;
      for (const otherFunc of sortedFunctions) {
        if (otherFunc === func) break;
        if (otherFunc.startLine <= func.startLine && 
            otherFunc.startLine + otherFunc.lines >= func.startLine + func.lines) {
          level++;
        }
      }
      
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(func);
    }

    // Process each level group
    for (const [level, groupFuncs] of levelGroups) {
      for (const func of groupFuncs) {
        const functionBody = this.extractFunctionBody(func.code!);
        if (!functionBody) continue;
        const normalizedCode = this.normalizeCode(functionBody).slice(0, MAX_CODE_LENGTH);
        const fingerprint = this.generateFingerprint(normalizedCode);

        // Exact match
        const existing = codeMap.get(fingerprint);
        if (existing && existing.level === level) {
          existing.count += 1;
          existing.indexes.push([func.startLine - 1, func.startLine - 1 + func.lines - 1]);
          continue;
        }

        // Look for similarities only among functions at the same level
        let foundSimilar = false;
        for (const [existingFingerprint, existing] of codeMap) {
          if (existing.level === level && this.areFingerprintsSimilar(fingerprint, existingFingerprint)) {
            const similarity = this.calculateSimilarityOptimized(normalizedCode, existingFingerprint);
            if (similarity >= SIMILARITY_THRESHOLD) {
              existing.count += 1;
              existing.indexes.push([func.startLine - 1, func.startLine - 1 + func.lines - 1]);
              foundSimilar = true;
              break;
            }
          }
        }

        if (!foundSimilar) {
          codeMap.set(fingerprint, { 
            count: 1, 
            lines: func.lines, 
            indexes: [[func.startLine - 1, func.startLine - 1 + func.lines - 1]],
            level 
          });
        }
      }
    }

    // Mark duplicated lines (all except the first occurrence of each fingerprint)
    for (const { count, indexes } of codeMap.values()) {
      if (count > 1) {
        indexes.slice(1).forEach(([start, end]) => {
          for (let i = start; i <= end; i++) {
            if (i >= 0 && i < duplicatedLineFlags.length) {
              duplicatedLineFlags[i] = true;
            }
          }
        });
      }
    }

    return duplicatedLineFlags.filter(Boolean).length;
  }

  private generateFingerprint(code: string): string {
    // Generate a fingerprint based on key code characteristics
    const features = [
      code.length,
      this.countKeywords(code),
      this.countOperators(code),
      this.countIdentifiers(code)
    ];
    return features.join('|');
  }

  private areFingerprintsSimilar(fp1: string, fp2: string): boolean {
    const [len1, keywords1, ops1, ids1] = fp1.split('|').map(Number);
    const [len2, keywords2, ops2, ids2] = fp2.split('|').map(Number);
    
    // Compare key characteristics
    const lengthDiff = Math.abs(len1 - len2) / Math.max(len1, len2);
    const keywordDiff = Math.abs(keywords1 - keywords2) / Math.max(keywords1, keywords2);
    const opsDiff = Math.abs(ops1 - ops2) / Math.max(ops1, ops2);
    const idsDiff = Math.abs(ids1 - ids2) / Math.max(ids1, ids2);

    // If differences are small, consider similar
    return lengthDiff < 0.2 && keywordDiff < 0.3 && opsDiff < 0.3 && idsDiff < 0.3;
  }

  private calculateSimilarityOptimized(str1: string, str2: string): number {
    // Use a sliding window approach to compare substrings
    const windowSize = 50;
    let matches = 0;
    let comparisons = 0;

    for (let i = 0; i < str1.length - windowSize; i += windowSize / 2) {
      const window1 = str1.slice(i, i + windowSize);
      for (let j = 0; j < str2.length - windowSize; j += windowSize / 2) {
        const window2 = str2.slice(j, j + windowSize);
        if (this.areWindowsSimilar(window1, window2)) {
          matches++;
        }
        comparisons++;
      }
    }

    return comparisons > 0 ? matches / comparisons : 0;
  }

  private areWindowsSimilar(window1: string, window2: string): boolean {
    // Quick window comparison using key features
    const features1 = this.extractWindowFeatures(window1);
    const features2 = this.extractWindowFeatures(window2);
    
    return Math.abs(features1 - features2) < 3; // Similarity threshold for windows
  }

  private extractWindowFeatures(window: string): number {
    // Extract key features from a code window
    return window.split('').reduce((acc, char) => {
      if (char === '{' || char === '}' || char === '(' || char === ')') acc += 2;
      if (char === ';' || char === '=' || char === '+' || char === '-') acc += 1;
      return acc;
    }, 0);
  }

  private countKeywords(code: string): number {
    const keywords = ['if', 'for', 'while', 'return', 'const', 'let', 'var', 'function'];
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      return count + (code.match(regex) || []).length;
    }, 0);
  }

  private countOperators(code: string): number {
    const operators = ['=', '==', '===', '!=', '!==', '+', '-', '*', '/', '%', '&&', '||'];
    return operators.reduce((count, op) => {
      return count + (code.split(op).length - 1);
    }, 0);
  }

  private countIdentifiers(code: string): number {
    return (code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []).length;
  }

  private extractFunctionBody(code: string): string | null {
    // Handle arrow functions with implicit return
    if (code.includes('=>')) {
      const arrowMatch = code.match(/=>\s*([^{]*)$/);
      if (arrowMatch) {
        return arrowMatch[1].trim();
      }
    }

    // Handle regular functions and arrow functions with block body
    const bodyMatch = code.match(/\{([\s\S]*)\}$/);
    if (!bodyMatch) return null;
    
    // Remove the outer braces and trim
    return bodyMatch[1].trim();
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/['"]/g, '"') // Normalize quotes
      .replace(/[;{}]/g, '') // Remove semicolons and braces
      .trim();
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
} 