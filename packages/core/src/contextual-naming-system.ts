import type { Node as BabelNode } from '@babel/types';
import type { FunctionContext } from './types.js';

const ARRAY_METHODS = ['map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce'];

export class ContextualNamingSystem {
  private contextStack: FunctionContext[] = [];
  private namedFunctions: Map<string, string> = new Map();
  private readonly CACHE_KEY_SEPARATOR = '::';
  
  // Static mappings
  private static readonly CONTEXT_NAME_MAPPINGS: Record<string, (ctx: FunctionContext) => string> = {
    OptionalCallExpression: (ctx) => `${ctx.objectName}?.${ctx.method} callback`,
    CallExpression: (ctx) => {
      if (!ctx.method) return 'anonymous';
      if (['then', 'catch', 'finally'].includes(ctx.method)) {
        return `${ctx.method} handler`;
      }
      if (ARRAY_METHODS.includes(ctx.method)) {
        return `${ctx.method} callback`;
      }
      if (ctx.method.startsWith('use')) {
        return `${ctx.method} callback`;
      }
      return `${ctx.objectName}.${ctx.method} callback`;
    },
    JSXExpressionContainer: (ctx) => `${ctx.objectName}.${ctx.method} callback`
  };

  private static readonly CONTEXT_EXTRACTORS: Record<string, (node: BabelNode) => FunctionContext | null> = {
    OptionalCallExpression: (node) => {
      const callee = (node as any).callee;
      if (callee?.type === 'OptionalMemberExpression') {
        return {
          type: 'OptionalCallExpression',
          objectName: callee.object?.name || 'object',
          method: callee.property?.name
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
          method: callee.property?.name
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
            method: callee.property?.name
          };
        }
      }
      return null;
    }
  };

  // Public methods
  public pushContext(context: FunctionContext) {
    this.contextStack.push(context);
  }

  public popContext() {
    this.contextStack.pop();
  }

  public generateName(node: BabelNode): string {
    const currentContext = this.getCurrentContext();
    const cacheKey = this.generateCacheKey(node, currentContext);
    const cachedName = this.namedFunctions.get(cacheKey);
    if (cachedName) {
      return cachedName;
    }
    if (!currentContext) {
      return 'anonymous';
    }
    const mapping = ContextualNamingSystem.CONTEXT_NAME_MAPPINGS[currentContext.type];
    let name = 'anonymous';
    if (mapping) {
      name = mapping(currentContext);
    } else if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
      name = (node as any).id.name;
    }
    this.namedFunctions.set(cacheKey, name);
    return name;
  }

  public extractContextFromNode(node: BabelNode): FunctionContext | null {
    for (const extractor of Object.values(ContextualNamingSystem.CONTEXT_EXTRACTORS)) {
      const context = extractor(node);
      if (context) return context;
    }
    return null;
  }

  private getCurrentContext(): FunctionContext | undefined {
    return this.contextStack.length > 0 ? this.contextStack[this.contextStack.length - 1] : undefined;
  }

  private generateCacheKey(node: BabelNode, context?: FunctionContext): string {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}${this.CACHE_KEY_SEPARATOR}${context?.type || 'no-context'}`;
  }
} 