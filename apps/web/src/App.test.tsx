import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock the API call
vi.mock('./api', () => ({
  analyzeRepo: vi.fn()
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the main components', () => {
    render(<App />);
    expect(screen.getByText('Code Analyzer Pro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter repository URL...')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  it('should handle repository analysis', async () => {
    const mockAnalysis = {
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
      ],
      summary: {
        totalFiles: 1,
        totalFunctions: 1,
        totalLines: 10,
        averageComplexity: 1,
        averageDuplication: 0,
        errorCount: 0,
        functionsOver50Lines: 0,
        functionsOverComplexity10: 0
      }
    };
    const { analyzeRepo } = await import('./api');
    (analyzeRepo as any).mockResolvedValueOnce(mockAnalysis);
    render(<App />);
    const input = screen.getByPlaceholderText('Enter repository URL...');
    const button = screen.getByText('Analyze');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('test.ts')).toBeInTheDocument();
    });
  });

  it('should handle Enter key press', async () => {
    const mockAnalysis = {
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
      ],
      summary: {
        totalFiles: 1,
        totalFunctions: 1,
        totalLines: 10,
        averageComplexity: 1,
        averageDuplication: 0,
        errorCount: 0,
        functionsOver50Lines: 0,
        functionsOverComplexity10: 0
      }
    };
    const { analyzeRepo } = await import('./api');
    (analyzeRepo as any).mockResolvedValueOnce(mockAnalysis);
    render(<App />);
    const input = screen.getByPlaceholderText('Enter repository URL...');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('test.ts')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    const { analyzeRepo } = await import('./api');
    (analyzeRepo as any).mockRejectedValueOnce(new Error('API Error'));
    render(<App />);
    const input = screen.getByPlaceholderText('Enter repository URL...');
    const button = screen.getByText('Analyze');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should validate repository URL', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter repository URL...');
    const button = screen.getByText('Analyze');
    fireEvent.change(input, { target: { value: 'invalid-url' } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid GitHub repository URL')).toBeInTheDocument();
    });
  });
}); 