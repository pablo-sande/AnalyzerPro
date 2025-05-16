import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileAnalysis as FileAnalysisType } from '@code-analyzer-pro/core';
import { useState, useEffect } from 'react';
import { InfoButton } from '@/components/InfoButton';
import { SortField, SortDirection, fileInfoFields, tableColumns, functionTypeColors } from '@/constants/fileAnalysis';
import { SortButton } from '@/components/SortButton';
import { InfoField } from '@/components/InfoField';
import { BackButton } from '@/components/BackButton';

export interface FileAnalysisProps {
  file: FileAnalysisType;
  mainSortField?: string;
  mainSortOrder?: string;
}

const FileInfo = ({ file }: { file: FileAnalysisType }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">File Information</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {fileInfoFields.map(({ label, value, className }) => {
        let computedClassName: string | undefined = className;
        if (label === 'Max Complexity' && file.maxComplexity > 10) {
          computedClassName = 'text-red-500';
        } else if (label === 'Duplication' && file.duplicationPercentage > 20) {
          computedClassName = 'text-yellow-500';
        } else if (label === 'Warnings' && file.warningCount > 0) {
          computedClassName = 'text-red-500';
        }
        return (
          <InfoField
            key={label}
            label={label}
            value={value(file)}
            className={computedClassName}
          />
        );
      })}
    </div>
  </div>
);

const FunctionTypeDistribution = ({ functions }: { functions: FileAnalysisType['functions'] }) => {
  const typeCounts = functions.reduce((acc, func) => {
    acc[func.type] = (acc[func.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = functions.length;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Function Types</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(typeCounts).map(([type, count]) => (
          <InfoField
            key={type}
            label={type.charAt(0).toUpperCase() + type.slice(1)}
            value={`${count} (${((count / total) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>
    </div>
  );
};

const FunctionsTable = ({ 
  functions, 
  sort, 
  onSort 
}: { 
  functions: FileAnalysisType['functions']; 
  sort: { field: SortField; order: SortDirection };
  onSort: (field: SortField) => void;
}) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">Functions</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            {tableColumns.map(({ field, label, info, position, align }) => (
              <th key={field} className={`px-4 py-2 text-${align}`}>
                <div className={`flex items-center ${align === 'right' ? 'justify-end' : ''}`}>
                  <SortButton field={field} label={label} currentSort={sort} onSort={onSort} />
                  <InfoButton info={info} position={position} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {functions.map((func, idx) => (
            <tr key={func.name + '-' + idx} className="border-t">
              <td className="px-4 py-2 font-mono text-sm">
                {func.name}
              </td>
              <td className="px-4 py-2">
                <span className={`font-medium ${functionTypeColors[func.type]}`}>
                  {func.type}
                </span>
              </td>
              <td className="px-4 py-2 text-right">{func.startLine}</td>
              <td className={`px-4 py-2 text-right ${func.complexity >= 10 ? 'text-red-500' : ''}`}>
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
);

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
      case 'type':
        return multiplier * a.type.localeCompare(b.type);
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <BackButton onClick={handleBack} />
          <h1 className="text-4xl font-bold">File Analysis</h1>
        </div>
        
        <div className="grid gap-4">
          <FileInfo file={file} />
          <FunctionTypeDistribution functions={file.functions} />
          <FunctionsTable 
            functions={sortedFunctions} 
            sort={sort} 
            onSort={handleSort} 
          />
        </div>
      </div>
    </div>
  );
} 