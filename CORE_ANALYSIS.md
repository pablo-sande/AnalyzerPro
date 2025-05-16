# Core Package Analysis

## Overview
The core package (`packages/core`) is the heart of the code analysis system. It provides the fundamental functionality for analyzing JavaScript/TypeScript codebases, extracting metrics, and generating comprehensive reports about code quality and structure.

## Process Flow

The analysis process follows this sequence:

1. **Repository Analysis** (`src/repository-analyzer.ts`)
   - Initialize the analyzer with repository path
   - Discover all relevant files using DFS
   - Process files in batches to manage memory
   - Aggregate results into a final analysis

2. **File Analysis** (`src/repository-analyzer.ts`)
   - Parse file into AST using Babel
   - Extract function information
   - Calculate metrics for each function
   - Generate file-level statistics

3. **Function Analysis** (`src/function-analyzer.ts`)
   - Analyze individual functions
   - Calculate complexity metrics
   - Detect function characteristics
   - Map function locations

4. **Result Aggregation** (`src/repository-analyzer.ts`)
   - Combine all file analyses
   - Calculate repository-wide metrics
   - Generate summary statistics
   - Format final results

## Architecture

### Main Components

1. **RepositoryAnalyzer Class** (`src/repository-analyzer.ts`)
   - The primary class that orchestrates the entire analysis process
   - Handles file discovery, parsing, and metric calculation
   - Implements performance optimizations through batch processing

2. **FunctionAnalyzer Class** (`src/function-analyzer.ts`)
   - Analyzes individual functions
   - Calculates complexity metrics
   - Detects function characteristics
   - Implements thresholds for warnings (50 lines, complexity > 10)

3. **DuplicationDetector Class** (`src/duplication-detector.ts`)
   - Detects code duplication
   - Calculates duplication metrics
   - Manages similarity analysis

4. **Type System** (`src/types.ts` and `src/types/`)
   - Defines the core data structures used throughout the analysis
   - Ensures type safety and clear interfaces between components

5. **AST Traversal** (`src/traverser.ts`)
   - Provides the main `traverse` function for AST traversal
   - Handles function detection and naming
   - Manages control flow analysis
   - Integrates with `ContextualNamingSystem` for function context
   - Includes `parseFile` function for Babel parsing with comprehensive plugin support

## Key Algorithms

### 1. File Discovery Algorithm (`src/repository-analyzer.ts:124-162`)
```typescript
private async findFiles(repoPath: string): Promise<string[]> {
  const files: string[] = [];
  const processDirectory = async (dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await processDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
    }
  };

  await processDirectory(repoPath);
  return files;
}
```

This algorithm uses a recursive Depth-First Search (DFS) to traverse the directory structure:
- Time Complexity: O(n) where n is the total number of files and directories
- Space Complexity: O(d) where d is the maximum directory depth
- Key optimizations:
  - Skips hidden directories and node_modules
  - Only processes relevant file extensions
  - Uses async/await for non-blocking I/O

### 2. AST Traversal System (`src/traverser.ts:1-162`)
```typescript
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
    // ... function name resolution logic ...

    options.onFunction(node as FunctionDeclaration | ArrowFunctionExpression | FunctionExpression, parentInfo);

    if (context) {
      namingSystem.popContext();
    }
  }

  // Handle control flow
  if (options.onControlFlow && CONTROL_FLOW_TYPES.includes(node.type)) {
    options.onControlFlow(node);
  }

  // Recursive traversal
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
```

The AST traversal system combines multiple algorithms:

1. **Depth-First Search (DFS)**
   - Time Complexity: O(n) where n is the number of nodes in the AST
   - Space Complexity: O(h) where h is the height of the AST
   - Key features:
     - Recursive traversal of all AST nodes
     - Efficient node type checking
     - Skip optimization for simple literals

2. **Context Management System**
```typescript
class ContextualNamingSystem {
  private contextStack: FunctionContext[] = [];

  public pushContext(context: FunctionContext) {
    if (this.contextStack.length > 0) {
      context.parent = this.contextStack[this.contextStack.length - 1];
    }
    this.contextStack.push(context);
  }
}
```
   - Stack-based state management
   - Time Complexity: O(1) for push/pop operations
   - Space Complexity: O(h) where h is the maximum nesting depth
   - Maintains function context hierarchy

3. **Pattern Matching**
   - Efficient node type identification
   - Extracts context information
   - Supports multiple function types:
     - FunctionDeclaration
     - ArrowFunctionExpression
     - FunctionExpression

Example of traversal process:
```javascript
function outer() {
  const inner = () => {
    const deepest = () => {
      // code
    };
  };
}
```

Traversal order:
1. FunctionDeclaration (outer)
2. VariableDeclaration (inner)
3. ArrowFunctionExpression (inner)
4. VariableDeclaration (deepest)
5. ArrowFunctionExpression (deepest)

Context stack during traversal:
```javascript
[
  { type: 'FunctionDeclaration', name: 'outer' },
  { type: 'ArrowFunctionExpression', name: 'inner' },
  { type: 'ArrowFunctionExpression', name: 'deepest' }
]
```

Key optimizations:
- Early return for simple literals
- Efficient parent context tracking
- Pattern-based node processing
- Stack-based context management

### 3. Function Analysis Algorithm (`src/function-analyzer.ts:1-86`)
```typescript
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
    
    // Calculate complexity
    let complexity = 1;
    traverse(functionNode, {
      onControlFlow: (node: BabelNode) => {
        if (['IfStatement', 'SwitchCase', 'ForStatement', 'WhileStatement', 
             'DoWhileStatement', 'CatchClause', 'ConditionalExpression',
             'ForInStatement', 'ForOfStatement', 'LogicalExpression'].includes(node.type)) {
          complexity++;
        }
      }
    });

    return {
      name: functionName,
      type: this.determineFunctionType(functionNode),
      size: functionSize,
      complexity,
      characteristics: this.analyzeFunctionCharacteristics(functionNode),
      location: {
        file: filePath,
        start: functionNode.loc?.start,
        end: functionNode.loc?.end
      }
    };
  }
}
```

This algorithm uses a single-pass AST traversal to analyze functions:
- Time Complexity: O(n) where n is the number of nodes in the function's AST
- Space Complexity: O(1) as it only stores metrics
- Key features:
  - Early termination for invalid nodes
  - Single-pass traversal for multiple metrics
  - Efficient node type checking

### 4. Code Duplication Detection (`src/duplication-detector.ts:1-202`)
```typescript
export class DuplicationDetector {
  private readonly SIMILARITY_THRESHOLD = 0.8;
  private readonly MAX_CODE_LENGTH = 1000;

  public findDuplicatedCode(functions: FunctionMetrics[], totalFileLines: number): number {
    const codeMap = new Map<string, { count: number, lines: number, indexes: number[][], level: number }>();
    const duplicatedLineFlags = new Array(totalFileLines).fill(false);

    // Sort functions by level (outermost first)
    const sortedFunctions = [...functions].sort((a, b) => {
      if (a.startLine <= b.startLine && a.startLine + a.lines >= b.startLine + b.lines) return -1;
      if (b.startLine <= a.startLine && b.startLine + b.lines >= a.startLine + a.lines) return 1;
      return a.startLine - b.startLine;
    });

    // ... rest of the implementation ...
  }
}
```

This algorithm implements a sophisticated code duplication detection system:

1. **Hierarchical Analysis**
   - Time Complexity: O(n log n) for sorting and grouping
   - Space Complexity: O(n) for storing function groups
   - Key features:
     - Functions are sorted by nesting level
     - Only compares functions at the same nesting level
     - Prevents false positives from nested functions

2. **Fingerprint Generation**
```typescript
private generateFingerprint(code: string): string {
  const features = [
    code.length,
    this.countKeywords(code),
    this.countOperators(code),
    this.countIdentifiers(code)
  ];
  return features.join('|');
}
```
   - Creates unique signatures for code blocks
   - Considers multiple code characteristics
   - Enables fast initial comparison

3. **Similarity Detection**
```typescript
private calculateSimilarityOptimized(str1: string, str2: string): number {
  const windowSize = 50;
  let matches = 0;
  let comparisons = 0;

  for (let i = 0; i < str1.length - windowSize; i += windowSize / 2) {
    const window1 = str1.slice(i, i + windowSize);
    for (let j = 0; j < str2.length - windowSize; j += windowSize / 2) {
      const window2 = str2.slice(j, j + windowSize);
      if (this.areWindowsSimilar(window1, window2)) {
        matches++;
      }
      comparisons++;
    }
  }

  return comparisons > 0 ? matches / comparisons : 0;
}
```
   - Uses sliding window approach for comparison
   - Time Complexity: O(n * m) where n and m are string lengths
   - Space Complexity: O(1) for comparison
   - Key features:
     - Handles similar but not identical code
     - Configurable similarity threshold
     - Efficient window-based comparison

4. **Line-based Tracking**
   - Uses boolean array to track duplicated lines
   - Ensures each line is counted only once
   - Prevents percentage from exceeding 100%
   - Maintains accurate line-level duplication data

5. **Code Normalization**
```typescript
private normalizeCode(code: string): string {
  return code
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/['"]/g, '"') // Normalize quotes
    .replace(/[;{}]/g, '') // Remove semicolons and braces
    .trim();
}
```
   - Handles formatting differences
   - Removes irrelevant syntax
   - Improves matching accuracy

Key optimizations:
- Level-based grouping reduces unnecessary comparisons
- Fingerprint-based initial filtering
- Sliding window comparison for similar code
- Boolean array for accurate line counting
- Normalized code comparison

The algorithm now provides:
- Accurate duplication percentages (never exceeding 100%)
- Proper handling of nested functions
- Detection of similar but not identical code
- Line-level precision in duplication tracking
- Efficient comparison through multiple optimization layers

## Error Handling

The system implements robust error handling:
- File parsing errors are caught and logged
- Directory traversal errors are handled gracefully
- Invalid AST nodes are skipped
- All errors are logged with context information

## Performance Optimizations

1. **Batch Processing** (`src/repository-analyzer.ts:13-67`)
```typescript
private readonly BATCH_SIZE = 100;

// Process files in batches to manage memory
for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
  const batch = files.slice(i, i + this.BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(file => this.analyzeFile(file))
  );
  // Process results...
}
```
- Files are processed in batches of 100 to prevent memory overflow
- Parallel processing using Promise.all for each batch
- Results are accumulated incrementally

2. **Efficient File Discovery**
- Skips hidden directories and node_modules
- Only processes relevant file extensions
- Uses async/await for non-blocking I/O

3. **Optimized AST Traversal**
- Single-pass traversal for multiple metrics
- Early termination for invalid nodes
- Efficient node type checking

## Code Quality Metrics

1. **Complexity Thresholds** (`src/repository-analyzer.ts:14-15`)
```typescript
private readonly COMPLEXITY_THRESHOLD = 10;
private readonly LINES_THRESHOLD = 50;
```
- Functions over 50 lines trigger a warning
- Functions with complexity over 10 trigger a warning
- These thresholds can be adjusted based on project needs

2. **Function Characteristics**
- Detects async functions
- Identifies generator functions
- Recognizes try-catch blocks
- Identifies for-of and for-in loops

3. **Code Duplication**
- Calculates percentage of duplicated code
- Normalizes code before comparison
- Considers entire functions for duplication

## Usage Example

```typescript
const analyzer = new CodeAnalyzer();
const result = await analyzer.analyzeRepo('/path/to/repo');

// Access analysis results
console.log(`Total files analyzed: ${result.summary.totalFiles}`);
console.log(`Total functions: ${result.summary.totalFunctions}`);
console.log(`Average complexity: ${result.summary.averageComplexity}`);
```

## Future Improvements

1. **Performance**
- Implement caching for parsed ASTs
- Add incremental analysis support
- Optimize memory usage for large codebases

2. **Analysis Depth**
- Add support for more complex metrics
- Implement dependency analysis
- Add support for more programming languages

3. **Integration**
- Add support for CI/CD pipelines
- Implement real-time analysis
- Add support for custom rules and thresholds