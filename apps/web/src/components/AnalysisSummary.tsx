import { AnalysisResult } from '@code-analyzer-pro/core';

interface AnalysisSummaryProps {
  summary: AnalysisResult['summary'];
}

export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Files</div>
          <div className="text-2xl font-bold">{summary.totalFiles}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Lines</div>
          <div className="text-2xl font-bold">{summary.totalLines}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Average Complexity</div>
          <div className="text-2xl font-bold">{summary.averageComplexity?.toFixed(2) || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
} 