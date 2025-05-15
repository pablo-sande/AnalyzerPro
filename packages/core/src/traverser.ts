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

interface FunctionContext {
  type: string;
  objectName?: string;
  method?: string;
  isOptional?: boolean;
  parent?: FunctionContext;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  } | null;
}

class ContextualNamingSystem {
  private contextStack: FunctionContext[] = [];
  private namedFunctions: Map<string, string> = new Map();
  private readonly CACHE_KEY_SEPARATOR = '::';

  // Mapeo estático de tipos de contexto a nombres de función
  private static readonly CONTEXT_NAME_MAPPINGS: Record<string, (ctx: FunctionContext) => string> = {
    OptionalCallExpression: (ctx) => `${ctx.objectName}?.${ctx.method} callback`,
    CallExpression: (ctx) => {
      if (!ctx.method) return 'anonymous';
      
      // Detectar tipos específicos de callbacks
      if (['then', 'catch', 'finally'].includes(ctx.method)) {
        return `${ctx.method} handler`;
      }
      if (['map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce'].includes(ctx.method)) {
        return `${ctx.method} callback`;
      }
      if (ctx.method.startsWith('use')) {
        return `${ctx.method} callback`;
      }
      return `${ctx.objectName}.${ctx.method} callback`;
    },
    JSXExpressionContainer: (ctx) => `${ctx.objectName}.${ctx.method} callback`
  };

  // Mapeo estático de tipos de nodo a extractores de contexto
  private static readonly CONTEXT_EXTRACTORS: Record<string, (node: BabelNode) => FunctionContext | null> = {
    OptionalCallExpression: (node) => {
      const callee = (node as any).callee;
      if (callee?.type === 'OptionalMemberExpression') {
        return {
          type: 'OptionalCallExpression',
          objectName: callee.object?.name || 'object',
          method: callee.property?.name,
          isOptional: true,
          loc: node.loc
        };
      }
      return null;
    },
    CallExpression: (node) => {
      const callee = (node as any).callee;
      if (callee?.type === 'MemberExpression') {
        return {
          type: 'CallExpression',
          objectName: callee.object?.name || 'object',
          method: callee.property?.name,
          loc: node.loc
        };
      }
      return null;
    },
    JSXExpressionContainer: (node) => {
      const expression = (node as any).expression;
      if (expression?.type === 'CallExpression') {
        const callee = expression.callee;
        if (callee?.type === 'MemberExpression') {
          return {
            type: 'JSXExpressionContainer',
            objectName: callee.object?.name || 'object',
            method: callee.property?.name,
            loc: node.loc
          };
        }
      }
      return null;
    }
  };

  private generateCacheKey(node: BabelNode, context?: FunctionContext): string {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}${this.CACHE_KEY_SEPARATOR}${context?.type || 'no-context'}`;
  }

  public pushContext(context: FunctionContext) {
    if (this.contextStack.length > 0) {
      context.parent = this.contextStack[this.contextStack.length - 1];
    }
    this.contextStack.push(context);
  }

  public popContext() {
    this.contextStack.pop();
  }

  private getCurrentContext(): FunctionContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  public generateName(node: BabelNode, parent?: BabelNode): string {
    const currentContext = this.getCurrentContext();
    
    // Intentar obtener el nombre del caché
    const cacheKey = this.generateCacheKey(node, currentContext);
    const cachedName = this.namedFunctions.get(cacheKey);
    if (cachedName) {
      return cachedName;
    }
    
    if (!currentContext) {
      return 'anonymous';
    }

    // Intentar obtener el nombre usando el mapeo estático
    const mapping = ContextualNamingSystem.CONTEXT_NAME_MAPPINGS[currentContext.type];
    let name = 'anonymous';
    
    if (mapping) {
      name = mapping(currentContext);
    } else if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
      name = (node as any).id.name;
    }

    // Guardar en el caché
    this.namedFunctions.set(cacheKey, name);
    return name;
  }

  public extractContextFromNode(node: BabelNode): FunctionContext | null {
    const extractor = ContextualNamingSystem.CONTEXT_EXTRACTORS[node.type as keyof typeof ContextualNamingSystem.CONTEXT_EXTRACTORS];
    return extractor ? extractor(node) : null;
  }
}

interface NodeInfo {
  node: BabelNode;
  parent?: {
    type: string;
    key?: string;
    value?: string;
    method?: string;
    isOptional?: boolean;
  };
}

export interface TraverseOptions {
  onFunction?: (node: FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parent?: NodeInfo['parent']) => void;
  onControlFlow?: (node: BabelNode) => void;
}

function getParentInfo(parent: BabelNode | undefined): NodeInfo['parent'] {
  if (!parent) return undefined;

  // Mapeo de tipos de nodo a sus propiedades de nombre
  const nameMappings = {
    VariableDeclarator: (p: any) => ({ type: 'VariableDeclarator', key: p.id?.name }),
    ObjectProperty: (p: any) => ({ type: 'ObjectProperty', key: p.key?.name }),
    ClassMethod: (p: any) => ({ type: 'ClassMethod', key: p.key?.name }),
    AssignmentExpression: (p: any) => ({ type: 'AssignmentExpression', key: p.left?.name }),
    ExportDefaultDeclaration: () => ({ type: 'ExportDefaultDeclaration', key: 'default' }),
    ObjectMethod: (p: any) => ({ type: 'ObjectMethod', key: p.key?.name }),
    ClassProperty: (p: any) => ({ type: 'ClassProperty', key: p.key?.name }),
    JSXAttribute: (p: any) => ({ type: 'JSXAttribute', key: p.name?.name })
  };

  // Intentar obtener el nombre usando el mapeo
  const mapping = nameMappings[parent.type as keyof typeof nameMappings];
  if (mapping) {
    return mapping(parent);
  }

  // Manejar ExportNamedDeclaration de forma especial
  if (parent.type === 'ExportNamedDeclaration') {
    const declaration = (parent as any).declaration;
    if (declaration) {
      if (declaration.type === 'VariableDeclaration') {
        const firstDeclarator = declaration.declarations[0];
        if (firstDeclarator?.id?.name) {
          return { type: 'ExportNamedDeclaration', key: firstDeclarator.id.name };
        }
      } else if (declaration.id?.name) {
        return { type: 'ExportNamedDeclaration', key: declaration.id.name };
      }
    }
  }

  // Manejar CallExpression de forma especial
  if (parent.type === 'CallExpression') {
    const callee = (parent as any).callee;
    if (callee?.type === 'Identifier') {
      return {
        type: 'CallExpression',
        key: callee.name,
        method: callee.name,
        value: `${callee.name} callback`
      };
    }
    else if (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') {
      const methodName = callee.property?.name || 'unknown';
      const objectName = callee.object?.name || 'object';
      const isOptional = callee.type === 'OptionalMemberExpression';

      return {
        type: 'CallExpression',
        key: objectName,
        method: methodName,
        isOptional,
        value: `${methodName} callback`
      };
    }
  }

  return undefined;
}

export function traverse(node: BabelNode, options: TraverseOptions, parent?: BabelNode) {
  if (!node) return;

  const namingSystem = new ContextualNamingSystem();

  // Skip literals and other simple nodes
  if (node.type === 'StringLiteral' || 
      node.type === 'NumericLiteral' || 
      node.type === 'BooleanLiteral' ||
      node.type === 'NullLiteral' ||
      node.type === 'RegExpLiteral') {
    return;
  }

  // Handle functions
  if (options.onFunction && (
    node.type === 'FunctionDeclaration' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  )) {
    const parentInfo = getParentInfo(parent);
    const context = namingSystem.extractContextFromNode(parent as BabelNode);
    
    if (context) {
      namingSystem.pushContext(context);
    }

    let functionName = 'anonymous';

    // Try to get function name from various sources
    if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
      functionName = (node as any).id.name;
    } else if (parentInfo) {
      if (parentInfo.type === 'CallExpression') {
        functionName = parentInfo.value || `${parentInfo.method} callback`;
      } else if (parentInfo.key) {
        functionName = parentInfo.key;
      }
    } else if (context) {
      functionName = namingSystem.generateName(node, parent);
    }

    // Force name on anonymous functions
    if ((node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') && 
        functionName !== 'anonymous') {
      (node as any).id = { type: 'Identifier', name: functionName };
    }

    options.onFunction(node as FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, {
      type: parent?.type || 'unknown',
      key: parentInfo?.key || functionName,
      method: context?.method,
      isOptional: context?.isOptional,
      value: functionName
    });

    if (context) {
      namingSystem.popContext();
    }
  }

  // Handle control flow
  if (options.onControlFlow && (
    node.type === 'IfStatement' ||
    node.type === 'SwitchCase' ||
    node.type === 'ForStatement' ||
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'CatchClause' ||
    node.type === 'ConditionalExpression' ||
    node.type === 'ForInStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'LogicalExpression'
  )) {
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