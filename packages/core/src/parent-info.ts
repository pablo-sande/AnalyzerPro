import type { Node as BabelNode } from '@babel/types';
import type { NodeInfo } from './types.js';

export function getParentInfo(parent: BabelNode | undefined): NodeInfo['parent'] {
  if (!parent) return undefined;

  const nameMappings = {
    VariableDeclarator: (p: any) => ({ type: 'VariableDeclarator', name: p.id?.name }),
    ObjectProperty: (p: any) => ({ type: 'ObjectProperty', name: p.key?.name }),
    ClassMethod: (p: any) => ({ type: 'ClassMethod', name: p.key?.name }),
    AssignmentExpression: (p: any) => ({ type: 'AssignmentExpression', name: p.left?.name }),
    ExportDefaultDeclaration: () => ({ type: 'ExportDefaultDeclaration', name: 'default' }),
    ObjectMethod: (p: any) => ({ type: 'ObjectMethod', name: p.key?.name }),
    ClassProperty: (p: any) => ({ type: 'ClassProperty', name: p.key?.name }),
    JSXAttribute: (p: any) => ({ type: 'JSXAttribute', name: p.name?.name })
  };

  const mapping = nameMappings[parent.type as keyof typeof nameMappings];
  if (mapping) {
    return mapping(parent);
  }

  if (parent.type === 'ExportNamedDeclaration') {
    const declaration = (parent as any).declaration;
    if (declaration) {
      if (declaration.type === 'VariableDeclaration') {
        const firstDeclarator = declaration.declarations[0];
        if (firstDeclarator?.id?.name) {
          return { type: 'ExportNamedDeclaration', name: firstDeclarator.id.name };
        }
      } else if (declaration.id?.name) {
        return { type: 'ExportNamedDeclaration', name: declaration.id.name };
      }
    }
  }

  if (parent.type === 'CallExpression') {
    const callee = (parent as any).callee;
    if (callee?.type === 'Identifier') {
      return {
        type: 'CallExpression',
        name: callee.name,
        method: callee.name
      };
    }
    else if (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') {
      const methodName = callee.property?.name || 'unknown';
      const objectName = callee.object?.name || 'object';
      return {
        type: 'CallExpression',
        name: methodName,
        objectName,
        method: methodName
      };
    }
  }

  return undefined;
} 