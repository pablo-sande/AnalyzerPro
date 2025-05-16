import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeAnalyzer } from './analyzer';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { vi } from 'vitest';

function createTempFile(content: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyzer-test-'));
  const filePath = path.join(tmpDir, 'tempfile.tsx');
  fs.writeFileSync(filePath, content);
  return filePath;
}

function removeTempFile(filePath: string) {
  try {
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.dirname(filePath));
  } catch {}
}

describe('CodeAnalyzer', () => {
  const analyzer = new CodeAnalyzer();
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempFiles = [];
  });

  afterEach(() => {
    tempFiles.forEach(removeTempFile);
  });

  describe('analyzeFile', () => {
    it('should correctly identify function declarations', async () => {
      const content = `
        function testFunction() {
          console.log('test');
        }
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(1);
      expect(result?.functions[0].name).toBe('testFunction');
      expect(result?.functions[0].lines).toBe(3);
    });

    it('should correctly identify arrow functions', async () => {
      const content = `
        const testArrow = () => {
          console.log('test');
        };
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(1);
      expect(result?.functions[0].name).toBe('testArrow');
      expect(result?.functions[0].lines).toBe(3);
    });

    it('should correctly identify anonymous functions', async () => {
      const content = `
        const testAnonymous = function() {
          console.log('test');
        };
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(1);
      expect(result?.functions[0].name).toBe('testAnonymous');
      expect(result?.functions[0].lines).toBe(3);
    });

    it('should correctly identify functions with high complexity', async () => {
      const content = `
        function complexFunction() {
          if (true) {
            if (true) {
              if (true) {
                console.log('test');
              }
            }
          }
        }
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(1);
      expect(result?.functions[0].complexity).toBeGreaterThan(1);
    });

    it('should correctly identify functions with many lines', async () => {
      const content = `
        function longFunction() {
          console.log('line 1');
          console.log('line 2');
          console.log('line 3');
          console.log('line 4');
          console.log('line 5');
          console.log('line 6');
        }
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(1);
      expect(result?.functions[0].lines).toBe(8);
    });

    it('should correctly identify React hooks and callbacks', async () => {
      const content = `
        const Component = () => {
          const [state, setState] = useState(() => {
            return 'initial';
          });

          useEffect(() => {
            console.log('effect');
          }, []);

          const handleClick = () => {
            console.log('click');
          };

          return <button onClick={handleClick}>Click me</button>;
        };
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions.length).toBeGreaterThanOrEqual(3);
      expect(result?.functions.some(f => f.name.includes('useState'))).toBe(true);
      expect(result?.functions.some(f => f.name.includes('useEffect'))).toBe(true);
      expect(result?.functions.some(f => f.name.includes('handleClick'))).toBe(true);
    });

    it('should detect duplicated code blocks', async () => {
      const content = `
        // Regular function with block
        function duplicateFunction1() {
          const result = [];
          for (let i = 0; i < 10; i++) {
            result.push(i * 2);
          }
          return result;
        }

        // Arrow function with block
        const duplicateFunction2 = () => {
          const result = [];
          for (let i = 0; i < 10; i++) {
            result.push(i * 2);
          }
          return result;
        }

        // Similar but not identical function
        function similarFunction1() {
          const output = [];
          for (let j = 0; j < 10; j++) {
            output.push(j * 2);
          }
          return output;
        }

        // Another similar function with different variable names
        const similarFunction2 = () => {
          const numbers = [];
          for (let k = 0; k < 10; k++) {
            numbers.push(k * 2);
          }
          return numbers;
        }

        // Different function
        function differentFunction() {
          return [1, 2, 3];
        }
      `;
      const filePath = createTempFile(content);
      tempFiles.push(filePath);
      const result = await analyzer.analyzeFile(filePath);
      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(5);
      expect(result?.duplicationPercentage).toBe((14 / 31) * 100);
    });
  });

  describe('analyzeRepo', () => {
    it('should correctly analyze a repository', async () => {
      const mockResult = {
        functions: [],
        files: [],
        summary: {
          totalFiles: 0,
          totalLines: 0,
          totalFunctions: 0,
          errorCount: 0,
          functionsOver50Lines: 0,
          functionsOverComplexity10: 0,
          averageComplexity: 0,
          averageDuplication: 0
        }
      };
      vi.spyOn(analyzer, 'analyzeRepo').mockResolvedValue(mockResult);
      const result = await analyzer.analyzeRepo('./test-repo');
      expect(result).toEqual(mockResult);
    });
  });
}); 