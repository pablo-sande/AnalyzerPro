'use client';

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { FileSearch } from '@/components/FileSearch';
import { AnalysisResult } from '@code-analyzer-pro/core';
import { analyzeRepo } from './api';
import { Header } from './components/Header';
import { RepositoryInput } from './components/RepositoryInput';
import { AnalysisSummary } from './components/AnalysisSummary';
import { FilesTable } from './components/FilesTable';
import { FileDetail } from './components/FileDetail';

function MainApp({ analysis, setAnalysis }: { analysis: AnalysisResult | null; setAnalysis: (analysis: AnalysisResult | null) => void }) {
  const [url, setUrl] = useState<string>(() => localStorage.getItem('lastUrl') || '');
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState({ 
    field: searchParams.get('sortField') || 'name', 
    order: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSearchParams(prev => {
      prev.set('sortField', sort.field);
      prev.set('sortOrder', sort.order);
      return prev;
    }, { replace: true });
  }, [sort, setSearchParams]);

  const handleAnalyze = async () => {
    if (!url) return;
    
    // Validar que la URL sea de GitHub
    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    if (!githubUrlPattern.test(url)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

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
    navigate(`/file?path=${encodeURIComponent(filePath)}&mainSortField=${sort.field}&mainSortOrder=${sort.order}`);
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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header onClearCache={handleClearCache} />
        
        <RepositoryInput
          url={url}
          loading={loading}
          onUrlChange={setUrl}
          onAnalyze={handleAnalyze}
        />

        {error && (
          <div className="p-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {analysis && (
          <>
            <FileSearch onSearch={handleSearch} />

            <div className="grid gap-4">
              <AnalysisSummary summary={analysis.summary} />
              <FilesTable
                files={sortedFiles || []}
                sort={sort}
                onSort={handleSort}
                onFileClick={handleFileClick}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    try {
      const savedAnalysis = localStorage.getItem('lastAnalysis');
      return savedAnalysis ? JSON.parse(savedAnalysis) : null;
    } catch (error) {
      localStorage.removeItem('lastAnalysis');
      return null;
    }
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp analysis={analysis} setAnalysis={setAnalysis} />} />
        <Route path="/file" element={<FileDetail analysis={analysis} />} />
      </Routes>
    </Router>
  );
} 