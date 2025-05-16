import { AnalysisResult } from '@code-analyzer-pro/core';
import { InfoButton } from './InfoButton';
import { SortButton } from './SortButton';
import { tableColumns, getWarningColor } from '@/constants/filesTable';

interface FilesTableProps {
  files: AnalysisResult['files'];
  sort: { field: string; order: 'asc' | 'desc' };
  onSort: (field: string) => void;
  onFileClick: (filePath: string) => void;
}

const TableHeader = ({ sort, onSort }: { 
  sort: { field: string; order: 'asc' | 'desc' }; 
  onSort: (field: string) => void;
}) => (
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
);

const TableRow = ({ file, onFileClick }: { 
  file: AnalysisResult['files'][0]; 
  onFileClick: (filePath: string) => void;
}) => {
  const warnings = file.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
  const warningColor = getWarningColor(warnings);

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-4 py-2 font-mono text-sm">
        <button
          onClick={() => onFileClick(file.path)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {file.path}
        </button>
      </td>
      <td className="px-4 py-2 text-right">{file.totalLines}</td>
      <td className="px-4 py-2 text-right">{file.functions.length}</td>
      <td className="px-4 py-2 text-right">{file.complexity?.toFixed(1) || 'N/A'}</td>
      <td className="px-4 py-2 text-right">{file.duplicationPercentage?.toFixed(1) || 'N/A'}%</td>
      <td className="px-4 py-2 text-right">
        <span className={`font-semibold ${warningColor}`}>{warnings}</span>
      </td>
    </tr>
  );
};

export function FilesTable({ files, sort, onSort, onFileClick }: FilesTableProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Files</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <TableHeader sort={sort} onSort={onSort} />
          </thead>
          <tbody>
            {files.map((file) => (
              <TableRow key={file.path} file={file} onFileClick={onFileClick} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 