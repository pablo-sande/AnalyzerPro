import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileAnalysis, FunctionMetrics, FunctionAnalysis, AnalysisResult } from './types.js';
import type { Node as BabelNode, FunctionDeclaration, ArrowFunctionExpression, FunctionExpression } from '@babel/types';
import { parseFile, traverse } from './traverser.js';
import { FunctionAnalyzer } from './function-analyzer.js';
import { DuplicationDetector } from './duplication-detector.js';

export class RepositoryAnalyzer {
  private readonly BATCH_SIZE = 100;
  private repoRoot: string = '';
  private functionAnalyzer: FunctionAnalyzer;
  private duplicationDetector: DuplicationDetector;

  constructor() {
    this.functionAnalyzer = new FunctionAnalyzer();
    this.duplicationDetector = new DuplicationDetector();
  }

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
        functionsOver50Lines: functions.filter(f => f.size > 50).length,
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
        onFunction: (node: BabelNode) => {
          if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
            const analysis = this.functionAnalyzer.analyzeFunction(node, filePath);
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
                hasWarning: this.functionAnalyzer.hasWarning(analysis.size, analysis.complexity),
                code: functionCode
              });
            }
          }
        }
      });

      const stats = await fs.stat(filePath);
      const totalLines = functions.reduce((sum, f) => sum + f.lines, 0);
      const duplicatedLines = this.duplicationDetector.findDuplicatedCode(functions, totalLines);
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