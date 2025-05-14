import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeRepo } from './index';
// Mock fetch
global.fetch = vi.fn();
describe('API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('analyzeRepo', () => {
        it('should analyze a repository successfully', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
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
                })
            };
            global.fetch.mockResolvedValueOnce(mockResponse);
            const result = await analyzeRepo('https://github.com/test/repo');
            expect(result).toBeDefined();
            expect(result.files).toHaveLength(1);
            expect(result.files[0].path).toBe('test.ts');
            expect(result.files[0].functions).toHaveLength(1);
            expect(result.files[0].functions[0].name).toBe('test');
        });
        it('should handle API errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
            global.fetch.mockResolvedValueOnce(mockResponse);
            await expect(analyzeRepo('https://github.com/test/repo')).rejects.toThrow('Failed to analyze repository');
        });
        it('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            await expect(analyzeRepo('https://github.com/test/repo')).rejects.toThrow('Network error');
        });
        it('should validate repository URL', async () => {
            await expect(analyzeRepo('invalid-url')).rejects.toThrow('Invalid GitHub repository URL');
        });
    });
});
