import { FileAnalysis as FileAnalysisType } from '@code-analyzer-pro/core';

export type SortField = 'name' | 'startLine' | 'complexity' | 'lines' | 'type';
export type SortDirection = 'asc' | 'desc';

export const fileInfoFields = [
  {
    label: 'Path',
    value: (file: FileAnalysisType) => file.path,
    className: 'font-mono'
  },
  {
    label: 'Size',
    value: (file: FileAnalysisType) => `${(file.fileSize / 1024).toFixed(1)} KB`,
    className: undefined
  },
  {
    label: 'Total Lines',
    value: (file: FileAnalysisType) => file.totalLines,
    className: undefined
  },
  {
    label: 'Functions',
    value: (file: FileAnalysisType) => file.functionsCount,
    className: undefined
  },
  {
    label: 'Max Complexity',
    value: (file: FileAnalysisType) => file.maxComplexity.toFixed(1),
    className: undefined
  },
  {
    label: 'Avg Complexity',
    value: (file: FileAnalysisType) => file.complexity.toFixed(1),
    className: undefined
  },
  {
    label: 'Duplication',
    value: (file: FileAnalysisType) => `${file.duplicationPercentage.toFixed(1)}%`,
    className: undefined
  },
  {
    label: 'Warnings',
    value: (file: FileAnalysisType) => file.warningCount,
    className: undefined
  }
] as const;

export const tableColumns = [
  {
    field: 'name' as SortField,
    label: 'Name',
    info: 'Function name and type',
    position: 'left' as const,
    align: 'left' as const
  },
  {
    field: 'type' as SortField,
    label: 'Type',
    info: 'Function type (function, method, promise, array, hook, callback)',
    position: 'left' as const,
    align: 'left' as const
  },
  {
    field: 'startLine' as SortField,
    label: 'Line',
    info: 'Starting line number of the function',
    position: 'center' as const,
    align: 'right' as const
  },
  {
    field: 'complexity' as SortField,
    label: 'Complexity',
    info: 'Cyclomatic complexity (red if > 10)',
    position: 'center' as const,
    align: 'right' as const
  },
  {
    field: 'lines' as SortField,
    label: 'Lines',
    info: 'Number of lines (red if > 50)',
    position: 'right' as const,
    align: 'right' as const
  }
] as const;

export const functionTypeColors = {
  function: 'text-blue-600',
  method: 'text-green-600',
  promise: 'text-purple-600',
  array: 'text-orange-600',
  hook: 'text-pink-600',
  callback: 'text-teal-600',
  arrow: 'text-indigo-600'
} as const; 