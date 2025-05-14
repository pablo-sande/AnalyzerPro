import { useNavigate } from 'react-router-dom';
import { FileAnalysis as FileAnalysisType } from '@code-analyzer-pro/core';

export interface FileAnalysisProps {
  file: FileAnalysisType;
}

export function FileAnalysis({ file }: FileAnalysisProps) {
  const navigate = useNavigate();
  if (!file) return null;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
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
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-right">Line</th>
                    <th className="px-4 py-2 text-right">Complexity</th>
                    <th className="px-4 py-2 text-right">Lines</th>
                    <th className="px-4 py-2 text-right">Fan In</th>
                    <th className="px-4 py-2 text-right">Fan Out</th>
                  </tr>
                </thead>
                <tbody>
                  {file.functions.map((func, idx) => (
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
                      <td className="px-4 py-2 text-right">{func.fanIn}</td>
                      <td className="px-4 py-2 text-right">{func.fanOut}</td>
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