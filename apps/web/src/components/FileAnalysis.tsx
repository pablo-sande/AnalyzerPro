import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileAnalysis as FileAnalysisType } from '@code-analyzer-pro/core';
import { useState, useEffect } from 'react';
import { InfoButton } from '@/components/InfoButton';

export interface FileAnalysisProps {
  file: FileAnalysisType;
  mainSortField?: string;
  mainSortOrder?: string;
}

type SortField = 'name' | 'startLine' | 'complexity' | 'lines';
type SortDirection = 'asc' | 'desc';

export function FileAnalysis({ file }: FileAnalysisProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState<{ field: SortField; order: SortDirection }>(() => {
    const field = searchParams.get('sortField') as SortField || 'startLine';
    const order = searchParams.get('sortOrder') as SortDirection || 'asc';
    return { field, order };
  });

  useEffect(() => {
    setSearchParams(prev => {
      prev.set('sortField', sort.field);
      prev.set('sortOrder', sort.order);
      return prev;
    }, { replace: true });
  }, [sort, setSearchParams]);

  if (!file) return null;

  const handleSort = (field: SortField) => {
    const newOrder = (sort.field === field && sort.order === 'asc' ? 'desc' : 'asc') as SortDirection;
    setSort({ field, order: newOrder });
  };

  const handleBack = () => {
    const mainSortField = searchParams.get('mainSortField') || 'name';
    const mainSortOrder = searchParams.get('mainSortOrder') || 'asc';
    navigate(`/?sortField=${mainSortField}&sortOrder=${mainSortOrder}`);
  };

  const sortedFunctions = [...file.functions].sort((a, b) => {
    const multiplier = sort.order === 'asc' ? 1 : -1;
    switch (sort.field) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'startLine':
        return multiplier * (a.startLine - b.startLine);
      case 'complexity':
        return multiplier * (a.complexity - b.complexity);
      case 'lines':
        return multiplier * (a.lines - b.lines);
      default:
        return 0;
    }
  });

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-500"
    >
      {label}
      {sort.field === field && (
        <span className="text-sm">
          {sort.order === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-bold">File Analysis</h1>
        </div>
        
        <div className="grid gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">File Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Path</div>
                <div className="text-sm font-mono">{file.path}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Name</div>
                <div className="text-sm">{file.name}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Extension</div>
                <div className="text-sm">{file.extension}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Size</div>
                <div className="text-sm">{(file.fileSize / 1024).toFixed(1)} KB</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Total Lines</div>
                <div className="text-sm">{file.totalLines}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Functions</div>
                <div className="text-sm">{file.functionsCount}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Functions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">
                      <div className="flex items-center">
                        <SortButton field="name" label="Name" />
                        <InfoButton info="Function name and type" position="left" />
                      </div>
                    </th>
                    <th className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end">
                        <SortButton field="startLine" label="Line" />
                        <InfoButton info="Starting line number of the function" position="center" />
                      </div>
                    </th>
                    <th className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end">
                        <SortButton field="complexity" label="Complexity" />
                        <InfoButton info="Cyclomatic complexity (red if > 10)" position="center" />
                      </div>
                    </th>
                    <th className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end">
                        <SortButton field="lines" label="Lines" />
                        <InfoButton info="Number of lines (red if > 50)" position="right" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFunctions.map((func, idx) => (
                    <tr key={func.name + '-' + idx} className="border-t">
                      <td className="px-4 py-2 font-mono text-sm">
                        {func.name}
                        <span className="ml-2 text-sm text-gray-500">({func.type})</span>
                      </td>
                      <td className="px-4 py-2 text-right">{func.startLine}</td>
                      <td className={`px-4 py-2 text-right ${func.complexity > 10 ? 'text-red-500' : ''}`}>
                        {func.complexity.toFixed(1)}
                      </td>
                      <td className={`px-4 py-2 text-right ${func.lines > 50 ? 'text-red-500' : ''}`}>
                        {func.lines}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 