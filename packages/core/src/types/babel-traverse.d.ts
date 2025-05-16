declare module '@babel/traverse' {
  import { Node } from '@babel/types';
  
  export interface NodePath<T = Node> {
    node: T;
    parent: Node;
    scope: any;
    get(key: string): NodePath;
    set(key: string, value: any): void;
  }

  export interface Visitor {
    [key: string]: (path: NodePath) => void;
  }

  export default function traverse(ast: Node, visitor: Visitor): void;
} 