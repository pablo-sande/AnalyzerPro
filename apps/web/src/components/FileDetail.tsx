import { useLocation } from 'react-router-dom';
import { AnalysisResult } from '@code-analyzer-pro/core';
import { FileAnalysis as FileAnalysisComponent } from './FileAnalysis';

interface FileDetailProps {
  analysis: AnalysisResult | null;
}

export function FileDetail({ analysis }: FileDetailProps) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const mainSortField = params.get('mainSortField') || 'name';
  const mainSortOrder = params.get('mainSortOrder') || 'asc';
  
  if (!filePath) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 text-red-700 bg-red-100 rounded-lg">
            No file path provided. Please select a file from the list.
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 text-red-700 bg-red-100 rounded-lg">
            No analysis data available. Please analyze the repository first.
          </div>
        </div>
      </div>
    );
  }

  const decodedFilePath = decodeURIComponent(filePath);
  const selectedFile = analysis.files.find(f => f.path === decodedFilePath);
  
  if (!selectedFile) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 text-red-700 bg-red-100 rounded-lg">
            File not found: {decodedFilePath}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FileAnalysisComponent
      file={{
        ...selectedFile,
        functions: selectedFile.functions.map(f => ({
          ...f,
          type: f.type || 'function'
        }))
      }}
      mainSortField={mainSortField}
      mainSortOrder={mainSortOrder}
    />
  );
} 