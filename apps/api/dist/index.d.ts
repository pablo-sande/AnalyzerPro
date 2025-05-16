import { Express } from 'express';
import { AnalysisResult } from '@code-analyzer-pro/core';
import { exec } from 'child_process';

declare const execAsync: typeof exec.__promisify__;
declare const app: Express;
declare function analyzeRepo(githubUrl: string): Promise<AnalysisResult>;

export { analyzeRepo, app, execAsync };
