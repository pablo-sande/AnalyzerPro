export const tableColumns = [
  {
    field: 'name',
    label: 'Path',
    info: 'The full path of the file in the repository',
    position: 'left' as const,
    align: 'left' as const
  },
  {
    field: 'lines',
    label: 'Lines',
    info: 'Total number of lines in the file',
    position: 'center' as const,
    align: 'right' as const
  },
  {
    field: 'functions',
    label: 'Functions',
    info: 'Number of functions found in the file',
    position: 'center' as const,
    align: 'right' as const
  },
  {
    field: 'complexity',
    label: 'Complexity',
    info: 'Average cyclomatic complexity of functions in the file',
    position: 'center' as const,
    align: 'right' as const
  },
  {
    field: 'duplication',
    label: 'Duplication',
    info: 'Percentage of code repetition of the functions in the file',
    position: 'right' as const,
    align: 'right' as const
  },
  {
    field: 'warnings',
    label: 'Warnings',
    info: 'Number of functions that have either more than 50 lines or complexity greater than 10',
    position: 'right' as const,
    align: 'right' as const
  }
] as const;

export const getWarningColor = (warnings: number) => {
  if (warnings >= 10) return 'text-red-600';
  if (warnings >= 5) return 'text-yellow-600';
  return 'text-green-600';
}; 