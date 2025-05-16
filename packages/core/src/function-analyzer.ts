import type { 
  Node as BabelNode,
  FunctionDeclaration, 
  ArrowFunctionExpression, 
  FunctionExpression
} from '@babel/types';
import type { FunctionAnalysis, FunctionMetrics } from './types.js';
import { traverse } from './traverser.js';

export class FunctionAnalyzer {
  private readonly COMPLEXITY_THRESHOLD = 10;
  private readonly LINES_THRESHOLD = 50;

  public analyzeFunction(node: BabelNode, filePath: string): FunctionAnalysis | null {
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

  public hasWarning(size: number, complexity: number): boolean {
    return size > this.LINES_THRESHOLD || complexity > this.COMPLEXITY_THRESHOLD;
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
} 