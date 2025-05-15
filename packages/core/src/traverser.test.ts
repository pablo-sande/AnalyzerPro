import { describe, it, expect } from 'vitest';
import { parseFile, traverse } from './traverser';

describe('Traverser', () => {
  describe('parseFile', () => {
    it('should parse valid JavaScript code', () => {
      const code = 'function test() { console.log("test"); }';
      const ast = parseFile(code);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('File');
    });

    it('should parse valid TypeScript code', () => {
      const code = 'function test(): void { console.log("test"); }';
      const ast = parseFile(code);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('File');
    });

    it('should parse valid JSX code', () => {
      const code = 'const Component = () => <div>Test</div>;';
      const ast = parseFile(code);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('File');
    });
  });

  describe('traverse', () => {
    it('should traverse and identify functions', () => {
      const code = `
        function test1() { console.log("test1"); }
        const test2 = () => { console.log("test2"); };
        const test3 = function() { console.log("test3"); };
      `;
      const ast = parseFile(code);
      const functions: any[] = [];
      
      traverse(ast, {
        onFunction: (node, parent) => {
          functions.push({ node, parent });
        }
      });

      expect(functions).toHaveLength(3);
      expect(functions[0].node.type).toBe('FunctionDeclaration');
      expect(functions[1].node.type).toBe('ArrowFunctionExpression');
      expect(functions[2].node.type).toBe('FunctionExpression');
    });

    it('should identify function context correctly', () => {
      const code = `
        const Component = () => {
          const handleClick = () => {
            console.log("click");
          };
          return <button onClick={handleClick}>Click</button>;
        };
      `;
      const ast = parseFile(code);
      const functions: any[] = [];
      
      traverse(ast, {
        onFunction: (node, parent) => {
          functions.push({ node, parent });
        }
      });

      expect(functions).toHaveLength(2);
      expect(functions[0].node.type).toBe('ArrowFunctionExpression');
      expect(functions[1].node.type).toBe('ArrowFunctionExpression');
      expect(functions[1].parent?.type).toBe('VariableDeclarator');
    });
  });
}); 