import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FileAnalysis } from './FileAnalysis';
import { BrowserRouter } from 'react-router-dom';
import { FileAnalysis as FileAnalysisType } from '@code-analyzer-pro/core';

const mockFile: FileAnalysisType = {
  path: '/test/file.ts',
  name: 'file.ts',
  extension: '.ts',
  totalLines: 100,
  functions: [
    {
      name: 'testFunction',
      type: 'function',
      startLine: 1,
      lines: 10,
      complexity: 2,
      hasWarning: false
    }
  ],
  functionsCount: 1,
  complexity: 2,
  maxComplexity: 2,
  duplicationPercentage: 0.1,
  warningCount: 0,
  fileSize: 1024
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('FileAnalysis', () => {
  it('renders file information correctly', () => {
    renderWithRouter(
      <FileAnalysis file={mockFile} />
    );
    expect(screen.getByText('/test/file.ts')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Functions' })).toBeInTheDocument();
    
    // Test max complexity in file info section
    const maxComplexityLabel = screen.getByText('Max Complexity');
    const maxComplexityValue = maxComplexityLabel.nextElementSibling;
    expect(maxComplexityValue).toHaveTextContent('2.0');
    
    // Test average complexity in file info section
    const avgComplexityLabel = screen.getByText('Avg Complexity');
    const avgComplexityValue = avgComplexityLabel.nextElementSibling;
    expect(avgComplexityValue).toHaveTextContent('2.0');
    
    expect(screen.getByText('0.1%')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render function details', () => {
    renderWithRouter(
      <FileAnalysis file={mockFile} />
    );
    expect(screen.getByText('testFunction')).toBeInTheDocument();
    expect(screen.getByText('function')).toBeInTheDocument();
    const row = screen.getByText('testFunction').closest('tr');
    expect(within(row as HTMLElement).getByText('2.0')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('10')).toBeInTheDocument();
  });

  it('should highlight functions with high complexity', () => {
    const highComplexityFile = {
      ...mockFile,
      functions: [
        {
          ...mockFile.functions[0],
          complexity: 10
        }
      ]
    };
    renderWithRouter(
      <FileAnalysis file={highComplexityFile} />
    );
    const row = screen.getByText('testFunction').closest('tr');
    const complexityCell = within(row as HTMLElement).getByText('10.0');
    expect(complexityCell).toHaveClass('text-red-500');
  });

  it('should highlight functions with many lines', () => {
    const manyLinesFile = {
      ...mockFile,
      functions: [
        {
          ...mockFile.functions[0],
          lines: 51
        }
      ]
    };
    renderWithRouter(
      <FileAnalysis file={manyLinesFile} />
    );
    const row = screen.getByText('testFunction').closest('tr');
    const linesCell = within(row as HTMLElement).getByText('51');
    expect(linesCell).toHaveClass('text-red-500');
  });

  it('should not highlight functions with low complexity and few lines', () => {
    renderWithRouter(
      <FileAnalysis file={mockFile} />
    );
    const row = screen.getByText('testFunction').closest('tr');
    const complexityCell = within(row as HTMLElement).getByText('2.0');
    const linesCell = within(row as HTMLElement).getByText('10');
    expect(complexityCell).not.toHaveClass('text-red-500');
    expect(linesCell).not.toHaveClass('text-red-500');
  });
}); 