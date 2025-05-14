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
  private targetFile: string | null = null;
  private readonly CACHE_KEY_SEPARATOR = '::';

  private generateCacheKey(node: BabelNode, context?: FunctionContext): string {
    const nodeId = `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
    const contextId = context ? `${context.type}-${context.method || ''}-${context.objectName || ''}` : 'no-context';
    return `${nodeId}${this.CACHE_KEY_SEPARATOR}${contextId}`;
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

    // Mapeo de tipos de contexto a nombres de función
    const contextNameMappings: Record<string, (context: FunctionContext) => string> = {
      OptionalCallExpression: (ctx) => `${ctx.objectName}?.${ctx.method} callback`,
      CallExpression: (ctx) => {
        if (ctx.method) {
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
        }
        return 'anonymous';
      },
      JSXExpressionContainer: (ctx) => `${ctx.objectName}.${ctx.method} callback`
    };

    // Intentar obtener el nombre usando el mapeo
    const mapping = contextNameMappings[currentContext.type];
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
    // Mapeo de tipos de nodo a funciones de extracción de contexto
    const contextExtractors: Record<string, (node: BabelNode) => FunctionContext | null> = {
      OptionalCallExpression: (node) => {
        const callee = (node as any).callee;
        if (callee?.type === 'OptionalMemberExpression') {
          return {
            type: 'OptionalCallExpression',
            objectName: callee.object?.name || 'object',
            method: callee.property?.name,
            isOptional: true,
            loc: node.loc ? {
              start: { line: node.loc.start.line, column: node.loc.start.column },
              end: { line: node.loc.end.line, column: node.loc.end.column }
            } : null
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
            loc: node.loc ? {
              start: { line: node.loc.start.line, column: node.loc.start.column },
              end: { line: node.loc.end.line, column: node.loc.end.column }
            } : null
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
              loc: node.loc ? {
                start: { line: node.loc.start.line, column: node.loc.start.column },
                end: { line: node.loc.end.line, column: node.loc.end.column }
              } : null
            };
          }
        }
        return null;
      }
    };

    // Intentar extraer el contexto usando el mapeo
    const extractor = contextExtractors[node.type as keyof typeof contextExtractors];
    if (extractor) {
      const context = extractor(node);
      if (context) {
        return context;
      }
    }

    return null;
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
  // Handle all types of functions
  if (
    (node.type === 'FunctionDeclaration' || 
     node.type === 'ArrowFunctionExpression' || 
     node.type === 'FunctionExpression') && 
    options.onFunction
  ) {
    const parentInfo = getParentInfo(parent);
    const context = namingSystem.extractContextFromNode(parent as BabelNode);
    
    if (context) {
      namingSystem.pushContext(context);
    }

    // Determinar el nombre de la función
    let functionName = 'anonymous';

    // 1. Intentar obtener el nombre del nodo si es una función declarada
    if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
      functionName = (node as any).id.name;
    }
    // 2. Intentar obtener el nombre del parentInfo
    else if (parentInfo) {
      if (parentInfo.type === 'CallExpression') {
        functionName = parentInfo.value || `${parentInfo.method} callback`;
      } else if (parentInfo.key) {
        functionName = parentInfo.key;
      }
    }
    // 3. Intentar obtener el nombre del contexto
    else if (context) {
      functionName = namingSystem.generateName(node, parent);
    }

    // Forzar el nombre en el nodo para funciones anónimas
    if ((node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') && 
        functionName !== 'anonymous') {
      (node as any).id = { type: 'Identifier', name: functionName };
    }

    // Llamar a onFunction con la información del padre
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

  // Handle control flow statements
  if (
    (node.type === 'IfStatement' ||
     node.type === 'SwitchCase' ||
     node.type === 'ForStatement' ||
     node.type === 'WhileStatement' ||
     node.type === 'DoWhileStatement' ||
     node.type === 'CatchClause' ||
     node.type === 'ConditionalExpression') &&
    options.onControlFlow
  ) {
    options.onControlFlow(node);
  }

  // Recursively traverse child nodes
  for (const key in node) {
    const value = (node as any)[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach(child => traverse(child, options, node));
      } else if (value.type) {
        traverse(value, options, node);
      }
    }
  }
}

export function calculateComplexity(node: BabelNode): number {
  let complexity = 1; // Base complexity for the function itself

  traverse(node, {
    onControlFlow: () => {
      complexity++; // Increment complexity for each control flow statement
    }
  });

  return complexity;
}

export function parseFile(content: string) {
  return parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
} 