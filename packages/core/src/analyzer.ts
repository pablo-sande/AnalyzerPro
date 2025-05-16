import { RepositoryAnalyzer } from './repository-analyzer.js';
import type { AnalysisResult } from './types.js';

export class CodeAnalyzer {
  private repositoryAnalyzer: RepositoryAnalyzer;

  constructor() {
    this.repositoryAnalyzer = new RepositoryAnalyzer();
  }

  public async analyzeRepo(repoPath: string): Promise<AnalysisResult> {
    return this.repositoryAnalyzer.analyzeRepo(repoPath);
  }
} 