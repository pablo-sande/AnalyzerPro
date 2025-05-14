'use client';

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FileSearch } from '@/components/FileSearch';
import { AnalysisResult } from '@code-analyzer-pro/core';
import { InfoButton } from '@/components/InfoButton';
import { FileAnalysis as FileAnalysisComponent } from '@/components/FileAnalysis';
import { analyzeRepo } from './api';

function MainApp({ analysis, setAnalysis }: { analysis: AnalysisResult | null; setAnalysis: (analysis: AnalysisResult | null) => void }) {
  const [url, setUrl] = useState<string>(() => localStorage.getItem('lastUrl') || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'name', order: 'asc' as 'asc' | 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeRepo(url);
      setAnalysis(data);
      localStorage.setItem('lastUrl', url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSort = (field: string) => {
    const newOrder = (sort.field === field && sort.order === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc';
    setSort({ field, order: newOrder });
  };

  const sortedFiles = analysis?.files
    .filter(file => search ? file.path.toLowerCase().includes(search.toLowerCase()) : true)
    .sort((a, b) => {
      const multiplier = sort.order === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'name':
          return multiplier * a.path.localeCompare(b.path);
        case 'lines':
          return multiplier * (a.totalLines - b.totalLines);
        case 'functions':
          return multiplier * (a.functions.length - b.functions.length);
        case 'complexity':
          return multiplier * ((a.complexity || 0) - (b.complexity || 0));
        case 'duplication':
          return multiplier * ((a.duplicationPercentage || 0) - (b.duplicationPercentage || 0));
        case 'warnings':
          const warningsA = a.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
          const warningsB = b.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
          return multiplier * (warningsA - warningsB);
        default:
          return 0;
      }
    });

  const handleFileClick = (filePath: string) => {
    if (!analysis) {
      setError('Analysis data not found. Please analyze the repository first.');
      return;
    }
    navigate(`/file?path=${encodeURIComponent(filePath)}`);
  };

  const handleClearCache = async () => {
    try {
      const response = await fetch('http://localhost:3000/cache/clear', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (response.ok) {
        setAnalysis(null);
        localStorage.removeItem('lastUrl');
        setUrl('');
        alert(`Cache cleared successfully. ${data.clearedKeys} keys removed.`);
      } else {
        throw new Error(data.error || 'Failed to clear cache');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to clear cache');
    }
  };

  const SortButton = ({ field, label }: { field: string; label: string }) => (
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
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center">Code Analyzer Pro</h1>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear Cache
          </button>
        </div>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url) {
                handleAnalyze();
              }
            }}
            placeholder="Enter repository URL..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="px-6 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && (
          <div className="p-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {analysis && (
          <>
            <FileSearch onSearch={handleSearch} />

            <div className="grid gap-4">
              <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Total Files</div>
                    <div className="text-2xl font-bold">{analysis.summary.totalFiles}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Total Lines</div>
                    <div className="text-2xl font-bold">{analysis.summary.totalLines}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Average Complexity</div>
                    <div className="text-2xl font-bold">{analysis.summary.averageComplexity?.toFixed(2) || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Files</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">
                          <div className="flex items-center">
                            <SortButton field="name" label="Path" />
                            <InfoButton info="The full path of the file in the repository" position="left" />
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <SortButton field="lines" label="Lines" />
                            <InfoButton info="Total number of lines in the file" position="center" />
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <SortButton field="functions" label="Functions" />
                            <InfoButton info="Number of functions found in the file" position="center" />
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <SortButton field="complexity" label="Complexity" />
                            <InfoButton info="Average cyclomatic complexity of functions in the file" position="center" />
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <SortButton field="duplication" label="Duplication" />
                            <InfoButton info="Percentage of code that is duplicated across the repository" position="right" />
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <SortButton field="warnings" label="Warnings" />
                            <InfoButton info="Number of functions that have either more than 50 lines or complexity greater than 10" position="right" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFiles?.map((file) => {
                        const warnings = file.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
                        let warningColor = 'text-green-600';
                        if (warnings >= 10) {
                          warningColor = 'text-red-600';
                        } else if (warnings >= 5) {
                          warningColor = 'text-yellow-600';
                        }
                        return (
                          <tr key={file.path} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-sm">
                              <button
                                onClick={() => handleFileClick(file.path)}
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function FileDetail({ analysis }: { analysis: AnalysisResult | null }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  
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
    />
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    try {
      const savedAnalysis = localStorage.getItem('lastAnalysis');
      return savedAnalysis ? JSON.parse(savedAnalysis) : null;
    } catch (error) {
      localStorage.removeItem('lastAnalysis');
      return null;
    }
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 text-gray-700 bg-gray-100 rounded-lg">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp analysis={analysis} setAnalysis={setAnalysis} />} />
        <Route path="/file" element={<FileDetail analysis={analysis} />} />
      </Routes>
    </Router>
  );
} 