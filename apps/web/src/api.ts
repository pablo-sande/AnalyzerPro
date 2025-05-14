import { AnalysisResult } from '@code-analyzer-pro/core';

export async function analyzeRepo(url: string): Promise<AnalysisResult> {
  const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze repository');
  }
  return response.json();
} 