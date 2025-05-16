import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeRepo, app } from './index';
import { exec } from 'child_process';
import { CodeAnalyzer } from '@code-analyzer-pro/core';
import request from 'supertest';

// Mock CodeAnalyzer
vi.mock('@code-analyzer-pro/core', () => ({
  CodeAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeRepo: vi.fn().mockResolvedValue({
      files: [
        {
          path: 'test.ts',
          functions: [
            {
              name: 'test',
              type: 'function',
              complexity: 1,
              lines: 10,
              startLine: 1
            }
          ]
        }
      ]
    }),
    parseFile: vi.fn()
  }))
}));

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn((command, callback) => {
    callback(null, { stdout: '', stderr: '' });
  })
}));

// Mock fetch
global.fetch = vi.fn();

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeRepo', () => {
    it('should analyze a repository successfully', async () => {
      const result = await analyzeRepo('https://github.com/test/repo');
      
      expect(result).toBeDefined();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('test.ts');
      expect(result.files[0].functions).toHaveLength(1);
      expect(result.files[0].functions[0].name).toBe('test');
    });

    it('should handle API errors', async () => {
      // Mock CodeAnalyzer to throw an error
      vi.mocked(CodeAnalyzer).mockImplementationOnce(() => ({
        analyzeRepo: vi.fn().mockRejectedValue(new Error('Failed to analyze repository')),
        parseFile: vi.fn()
      }));

      await expect(analyzeRepo('https://github.com/test/repo')).rejects.toThrow('Failed to analyze repository');
    });

    it('should handle network errors', async () => {
      // Mock CodeAnalyzer to throw a network error
      vi.mocked(CodeAnalyzer).mockImplementationOnce(() => ({
        analyzeRepo: vi.fn().mockRejectedValue(new Error('Network error')),
        parseFile: vi.fn()
      }));

      await expect(analyzeRepo('https://github.com/test/repo')).rejects.toThrow('Network error');
    });

    it('should validate repository URL', async () => {
      await expect(analyzeRepo('invalid-url')).rejects.toThrow('Invalid GitHub repository URL');
    });
  });

  describe('API Endpoints', () => {
    it('should return 400 when URL is missing', async () => {
      const response = await request(app).get('/analyze');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL parameter is required');
    });

    it('should return 400 when URL and path are missing', async () => {
      const response = await request(app).get('/analyze/file');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL and path are required');
    });
  });
}); 