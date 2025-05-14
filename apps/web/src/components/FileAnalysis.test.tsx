import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      lines: 10,
      startLine: 1,
      complexity: 2,
      fanIn: 1,
      fanOut: 2,
      type: 'function',
      hasWarning: false
    }
  ],
  functionsCount: 1,
  complexity: 2,
  maxComplexity: 2,
  averageFanIn: 1,
  averageFanOut: 2,
  duplicationPercentage: 0.1,
  warningCount: 0,
  fileSize: 1024
};

describe('FileAnalysis', () => {
  it('renders file information', () => {
    render(
      <BrowserRouter>
        <FileAnalysis file={mockFile} />
      </BrowserRouter>
    );

    expect(screen.getByText('File Information')).toBeInTheDocument();
    expect(screen.getByText('/test/file.ts')).toBeInTheDocument();
    expect(screen.getByText('file.ts')).toBeInTheDocument();
    expect(screen.getByText('.ts')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('should render function details', () => {
    render(
      <BrowserRouter>
        <FileAnalysis file={mockFile} />
      </BrowserRouter>
    );
    
    // Check function names
    expect(screen.getByText('testFunction')).toBeInTheDocument();
    
    // Check function types
    expect(screen.getByText('function')).toBeInTheDocument();
    
    // Check complexity
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check lines
    expect(screen.getByText('10')).toBeInTheDocument();
    
    // Check line numbers
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should highlight functions with high complexity', () => {
    const highComplexityFile: FileAnalysisType = {
      ...mockFile,
      functions: [{
        ...mockFile.functions[0],
        complexity: 15
      }]
    };

    render(
      <BrowserRouter>
        <FileAnalysis file={highComplexityFile} />
      </BrowserRouter>
    );
    const complexityCell = screen.getByText('15').closest('td');
    expect(complexityCell).toHaveClass('text-red-500');
  });

  it('should highlight functions with many lines', () => {
    const manyLinesFile: FileAnalysisType = {
      ...mockFile,
      functions: [{
        ...mockFile.functions[0],
        lines: 60
      }]
    };

    render(
      <BrowserRouter>
        <FileAnalysis file={manyLinesFile} />
      </BrowserRouter>
    );
    const linesCell = screen.getByText('60').closest('td');
    expect(linesCell).toHaveClass('text-red-500');
  });

  it('should not highlight functions with low complexity and few lines', () => {
    render(
      <BrowserRouter>
        <FileAnalysis file={mockFile} />
      </BrowserRouter>
    );
    const complexityCell = screen.getByText('2').closest('td');
    const linesCell = screen.getByText('10').closest('td');
    expect(complexityCell).not.toHaveClass('text-red-500');
    expect(linesCell).not.toHaveClass('text-red-500');
  });
}); 