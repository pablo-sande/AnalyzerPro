#!/usr/bin/env node
import { Command } from 'commander';
import { CodeAnalyzer } from '@code-analyzer-pro/core';
import axios from 'axios';
import * as path from 'path';
const program = new Command();
program
    .name('cap')
    .description('Code Analyzer Pro CLI')
    .version('1.0.0');
program
    .command('scan')
    .description('Scan a repository for code analysis')
    .argument('<path>', 'path to the repository')
    .option('-a, --api <url>', 'API endpoint URL', 'http://localhost:3000')
    .action(async (repoPath, options) => {
    try {
        console.log('🔍 Scanning repository...');
        const analyzer = new CodeAnalyzer();
        const result = await analyzer.analyzeRepo(path.resolve(repoPath));
        console.log('📊 Analysis complete!');
        console.log('\nSummary:');
        console.log(`Total files: ${result.summary.totalFiles}`);
        console.log(`Total lines: ${result.summary.totalLines}`);
        console.log(`Functions > 50 lines: ${result.summary.functionsOver50Lines}`);
        console.log(`Functions > complexity 10: ${result.summary.functionsOverComplexity10}`);
        console.log(`Average complexity: ${result.summary.averageComplexity.toFixed(2)}`);
        console.log(`Average duplication: ${result.summary.averageDuplication.toFixed(2)}%`);
        // Send results to API
        if (options.api) {
            try {
                const response = await axios.post(`${options.api}/upload`, result);
                console.log(`\n✅ Results uploaded successfully! Analysis ID: ${response.data.id}`);
                console.log(`View results at: ${options.api}/metrics/${response.data.id}`);
            }
            catch (error) {
                const err = error;
                console.error('\n❌ Failed to upload results to API:', err.message);
            }
        }
    }
    catch (error) {
        const err = error;
        console.error('Error:', err.message);
        process.exit(1);
    }
});
program.parse();
async function main() {
    try {
        const options = program.opts();
        const analyzer = new CodeAnalyzer();
        const result = await analyzer.analyzeRepo(options.path);
        if (options.api) {
            try {
                const response = await axios.post(`${options.api}/upload`, result);
            }
            catch (error) {
                const err = error;
                console.error('\n❌ Failed to upload results to API:', err.message);
            }
        }
    }
    catch (error) {
        const err = error;
        console.error('Error:', err.message);
        process.exit(1);
    }
}
main();
