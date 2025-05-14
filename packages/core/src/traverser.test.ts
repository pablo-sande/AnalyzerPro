import { describe, it, expect } from 'vitest';
import { parseFile, traverse, calculateComplexity } from './traverser';

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

  describe('calculateComplexity', () => {
    it('should calculate complexity for simple function', () => {
      const code = 'function test() { console.log("test"); }';
      const ast = parseFile(code);
      const complexity = calculateComplexity(ast.program.body[0]);
      expect(complexity).toBe(1);
    });

    it('should calculate complexity for function with if statement', () => {
      const code = 'function test() { if (true) { console.log("test"); } }';
      const ast = parseFile(code);
      const complexity = calculateComplexity(ast.program.body[0]);
      expect(complexity).toBe(2);
    });

    it('should calculate complexity for function with multiple conditions', () => {
      const code = `
        function test() {
          if (true) {
            if (false) {
              console.log("test");
            }
          }
        }
      `;
      const ast = parseFile(code);
      const complexity = calculateComplexity(ast.program.body[0]);
      expect(complexity).toBe(3);
    });

    it('should calculate complexity for function with loops', () => {
      const code = `
        function test() {
          for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
              console.log("even");
            }
          }
        }
      `;
      const ast = parseFile(code);
      const complexity = calculateComplexity(ast.program.body[0]);
      expect(complexity).toBe(3);
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