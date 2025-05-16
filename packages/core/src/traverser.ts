import { parse } from '@babel/parser';
import type { 
  Node as BabelNode, 
  FunctionDeclaration, 
  ArrowFunctionExpression,
  FunctionExpression,
  IfStatement, 
  SwitchCase, 
  ForStatement, 
  WhileStatement, 
  DoWhileStatement, 
  CatchClause, 
  ConditionalExpression,
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
  MemberExpression
} from '@babel/types';
import type { TraverseOptions } from './types.js';
import { ContextualNamingSystem } from './contextual-naming-system.js';
import { getParentInfo } from './parent-info.js';

// Constants
const CONTROL_FLOW_TYPES = [
  'IfStatement',
  'SwitchCase',
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
  'ConditionalExpression',
  'ForInStatement',
  'ForOfStatement',
  'LogicalExpression'
];
const NODE_TYPES_TO_SKIP = [
  'StringLiteral',
  'NumericLiteral',
  'BooleanLiteral',
  'NullLiteral',
  'RegExpLiteral',
];
const FUNCTION_TYPES = [
  'FunctionDeclaration',
  'ArrowFunctionExpression',
  'FunctionExpression'
];

// Main Traversing Function
export function traverse(node: BabelNode, options: TraverseOptions, parent?: BabelNode) {
  if (!node) return;

  const namingSystem = new ContextualNamingSystem();

  // Skip literals and other simple nodes
  if (NODE_TYPES_TO_SKIP.includes(node.type)) {
    return;
  }

  // Handle functions
  if (options.onFunction && FUNCTION_TYPES.includes(node.type)) {
    const parentInfo = getParentInfo(parent);
    const context = namingSystem.extractContextFromNode(parent as BabelNode);
    
    if (context) {
      namingSystem.pushContext(context);
    }

    let functionName = 'anonymous';

    if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
      functionName = (node as any).id.name;
    } else if (parentInfo) {
      if (parentInfo.type === 'CallExpression') {
        functionName = parentInfo.method || parentInfo.name || 'anonymous';
      } else if (parentInfo.name) {
        functionName = parentInfo.name;
      }
    } else if (context) {
      functionName = namingSystem.generateName(node as BabelNode);
    }

    if ((node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') && 
        functionName !== 'anonymous') {
      (node as any).id = { type: 'Identifier', name: functionName };
    }

    options.onFunction(node as FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parentInfo);

    if (context) {
      namingSystem.popContext();
    }
  }

  // Handle control flow
  if (options.onControlFlow && CONTROL_FLOW_TYPES.includes(node.type as typeof CONTROL_FLOW_TYPES[number])) {
    options.onControlFlow(node);
  }

  // Recursively traverse all properties that might contain nodes
  Object.keys(node).forEach(key => {
    const value = (node as any)[key];
    
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach(child => {
          if (child && typeof child === 'object' && 'type' in child) {
            traverse(child, options, node);
          }
        });
      } else if ('type' in value) {
        traverse(value, options, node);
      }
    }
  });
}

// Parser Configuration
export function parseFile(content: string) {
  return parse(content, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'decorators-legacy',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'dynamicImport',
      'doExpressions',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      ['pipelineOperator', { proposal: 'minimal' }],
      'throwExpressions',
      'classPrivateProperties',
      'classPrivateMethods',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'partialApplication',
      'recordAndTuple',
      'throwExpressions',
      'topLevelAwait'
    ],
    errorRecovery: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    ranges: true,
    tokens: true
  });
} 