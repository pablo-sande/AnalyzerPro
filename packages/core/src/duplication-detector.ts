import type { FunctionMetrics } from './types.js';

export class DuplicationDetector {
  private readonly SIMILARITY_THRESHOLD = 0.8;
  private readonly MAX_CODE_LENGTH = 1000;

  public findDuplicatedCode(functions: FunctionMetrics[], totalFileLines: number): number {
    const codeMap = new Map<string, { count: number, lines: number, indexes: number[][], level: number }>();
    const duplicatedLineFlags = new Array(totalFileLines).fill(false);

    // Sort functions by level (outermost first)
    const sortedFunctions = [...functions].sort((a, b) => {
      // If a function is contained within another, the containing one goes first
      if (a.startLine <= b.startLine && a.startLine + a.lines >= b.startLine + b.lines) return -1;
      if (b.startLine <= a.startLine && b.startLine + b.lines >= a.startLine + a.lines) return 1;
      return a.startLine - b.startLine;
    });

    // Group functions by level
    const levelGroups = new Map<number, FunctionMetrics[]>();
    for (const func of sortedFunctions) {
      if (!func.code) continue;
      
      // Determine function level
      let level = 0;
      for (const otherFunc of sortedFunctions) {
        if (otherFunc === func) break;
        if (otherFunc.startLine <= func.startLine && 
            otherFunc.startLine + otherFunc.lines >= func.startLine + func.lines) {
          level++;
        }
      }
      
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(func);
    }

    // Process each level group
    for (const [level, groupFuncs] of levelGroups) {
      for (const func of groupFuncs) {
        const functionBody = this.extractFunctionBody(func.code);
        if (!functionBody) continue;
        const normalizedCode = this.normalizeCode(functionBody).slice(0, this.MAX_CODE_LENGTH);
        const fingerprint = this.generateFingerprint(normalizedCode);

        // Exact match
        const existing = codeMap.get(fingerprint);
        if (existing && existing.level === level) {
          existing.count += 1;
          existing.indexes.push([func.startLine - 1, func.startLine - 1 + func.lines - 1]);
          continue;
        }

        // Look for similarities only among functions at the same level
        let foundSimilar = false;
        for (const [existingFingerprint, existing] of codeMap) {
          if (existing.level === level && this.areFingerprintsSimilar(fingerprint, existingFingerprint)) {
            const similarity = this.calculateSimilarityOptimized(normalizedCode, existingFingerprint);
            if (similarity >= this.SIMILARITY_THRESHOLD) {
              existing.count += 1;
              existing.indexes.push([func.startLine - 1, func.startLine - 1 + func.lines - 1]);
              foundSimilar = true;
              break;
            }
          }
        }

        if (!foundSimilar) {
          codeMap.set(fingerprint, { 
            count: 1, 
            lines: func.lines, 
            indexes: [[func.startLine - 1, func.startLine - 1 + func.lines - 1]],
            level 
          });
        }
      }
    }

    // Mark duplicated lines (all except the first occurrence of each fingerprint)
    for (const { count, indexes } of codeMap.values()) {
      if (count > 1) {
        indexes.slice(1).forEach(([start, end]) => {
          for (let i = start; i <= end; i++) {
            if (i >= 0 && i < duplicatedLineFlags.length) {
              duplicatedLineFlags[i] = true;
            }
          }
        });
      }
    }

    return duplicatedLineFlags.filter(Boolean).length;
  }

  private generateFingerprint(code: string): string {
    // Generate a fingerprint based on key code characteristics
    const features = [
      code.length,
      this.countKeywords(code),
      this.countOperators(code),
      this.countIdentifiers(code)
    ];
    return features.join('|');
  }

  private areFingerprintsSimilar(fp1: string, fp2: string): boolean {
    const [len1, keywords1, ops1, ids1] = fp1.split('|').map(Number);
    const [len2, keywords2, ops2, ids2] = fp2.split('|').map(Number);
    
    // Compare key characteristics
    const lengthDiff = Math.abs(len1 - len2) / Math.max(len1, len2);
    const keywordDiff = Math.abs(keywords1 - keywords2) / Math.max(keywords1, keywords2);
    const opsDiff = Math.abs(ops1 - ops2) / Math.max(ops1, ops2);
    const idsDiff = Math.abs(ids1 - ids2) / Math.max(ids1, ids2);

    // If differences are small, consider similar
    return lengthDiff < 0.2 && keywordDiff < 0.3 && opsDiff < 0.3 && idsDiff < 0.3;
  }

  private calculateSimilarityOptimized(str1: string, str2: string): number {
    // Use a sliding window approach to compare substrings
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

  private areWindowsSimilar(window1: string, window2: string): boolean {
    // Quick window comparison using key features
    const features1 = this.extractWindowFeatures(window1);
    const features2 = this.extractWindowFeatures(window2);
    
    return Math.abs(features1 - features2) < 3; // Similarity threshold for windows
  }

  private extractWindowFeatures(window: string): number {
    // Extract key features from a code window
    return window.split('').reduce((acc, char) => {
      if (char === '{' || char === '}' || char === '(' || char === ')') acc += 2;
      if (char === ';' || char === '=' || char === '+' || char === '-') acc += 1;
      return acc;
    }, 0);
  }

  private countKeywords(code: string): number {
    const keywords = ['if', 'for', 'while', 'return', 'const', 'let', 'var', 'function'];
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      return count + (code.match(regex) || []).length;
    }, 0);
  }

  private countOperators(code: string): number {
    const operators = ['=', '==', '===', '!=', '!==', '+', '-', '*', '/', '%', '&&', '||'];
    return operators.reduce((count, op) => {
      return count + (code.split(op).length - 1);
    }, 0);
  }

  private countIdentifiers(code: string): number {
    return (code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []).length;
  }

  private extractFunctionBody(code: string): string | null {
    // Handle arrow functions with implicit return
    if (code.includes('=>')) {
      const arrowMatch = code.match(/=>\s*([^{]*)$/);
      if (arrowMatch) {
        return arrowMatch[1].trim();
      }
    }

    // Handle regular functions and arrow functions with block body
    const bodyMatch = code.match(/\{([\s\S]*)\}$/);
    if (!bodyMatch) return null;
    
    // Remove the outer braces and trim
    return bodyMatch[1].trim();
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/['"]/g, '"') // Normalize quotes
      .replace(/[;{}]/g, '') // Remove semicolons and braces
      .trim();
  }
} 