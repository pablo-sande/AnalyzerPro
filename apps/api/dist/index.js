import express from 'express';
import cors from 'cors';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { CodeAnalyzer } from '@code-analyzer-pro/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
const execAsync = promisify(exec);
const app = express();
const port = process.env.PORT || 3000;
// Redis configuration
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});
// Middleware
app.use(cors());
app.use(express.json());
// Helper function to clone and analyze a GitHub repository
async function cloneAndAnalyzeRepo(githubUrl) {
    // Create a temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
    try {
        // Clone the repository
        await execAsync(`git clone ${githubUrl} ${tempDir}`);
        // Analyze the repository
        const analyzer = new CodeAnalyzer();
        const result = await analyzer.analyzeRepo(tempDir);
        // Clean up file paths by removing the temporary directory prefix
        result.files = result.files.map(file => ({
            ...file,
            path: file.path.replace(tempDir, '').replace(/^[\/\\]/, '') // Remove temp dir prefix and leading slash
        }));
        return result;
    }
    finally {
        // Clean up: remove the temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
// Routes
app.post('/upload', async (req, res) => {
    try {
        const analysisResult = req.body;
        const id = uuidv4();
        // Store in Redis with 1 hour TTL
        await redis.setex(`analysis:${id}`, 3600, JSON.stringify(analysisResult));
        res.json({ id });
    }
    catch (error) {
        console.error('Error storing analysis:', error);
        res.status(500).json({ error: 'Failed to store analysis' });
    }
});
app.get('/metrics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await redis.get(`analysis:${id}`);
        if (!data) {
            return res.status(404).json({ error: 'Analysis not found or expired' });
        }
        const analysis = JSON.parse(data);
        res.json(analysis);
    }
    catch (error) {
        console.error('Error retrieving analysis:', error);
        res.status(500).json({ error: 'Failed to retrieve analysis' });
    }
});
app.get('/analyze', async (req, res) => {
    try {
        const { url, search, sortBy, sortOrder } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }
        // Check cache
        const cacheKey = `analysis:${url}`;
        const cachedResult = await redis.get(cacheKey);
        let result;
        if (cachedResult) {
            result = JSON.parse(cachedResult);
        }
        else {
            // If not in cache, clone and analyze the repository
            result = await cloneAndAnalyzeRepo(url);
            // Cache the result
            await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // Cache for 1 hour
        }
        // Apply filtering and sorting to the result
        let filteredFiles = [...result.files];
        // Apply search filter if provided
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredFiles = filteredFiles.filter(file => file.path.toLowerCase().includes(searchTerm));
        }
        // Apply sorting if provided
        if (sortBy) {
            const order = sortOrder === 'desc' ? -1 : 1;
            filteredFiles.sort((a, b) => {
                switch (sortBy) {
                    case 'lines':
                        return (a.totalLines - b.totalLines) * order;
                    case 'functions':
                        return (a.functions.length - b.functions.length) * order;
                    case 'complexity':
                        return (a.complexity - b.complexity) * order;
                    case 'duplication':
                        return (a.duplicationPercentage - b.duplicationPercentage) * order;
                    case 'name':
                        return a.path.localeCompare(b.path) * order;
                    case 'lastModified':
                        return ((a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0)) * order;
                    case 'warnings':
                        const warningsA = a.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
                        const warningsB = b.functions.filter(f => f.lines > 50 || f.complexity > 10).length;
                        return (warningsA - warningsB) * order;
                    default:
                        return 0;
                }
            });
        }
        res.json({
            ...result,
            files: filteredFiles
        });
    }
    catch (error) {
        console.error('Error analyzing repository:', error);
        res.status(500).json({ error: 'Failed to analyze repository' });
    }
});
// Endpoint para análisis detallado de un archivo
app.get('/analyze/file', async (req, res) => {
    const { url, path } = req.query;
    if (!url || !path) {
        return res.status(400).json({ error: 'URL and path are required' });
    }
    try {
        // Intentar obtener el análisis desde Redis
        const cacheKey = `analysis:${url}`;
        const cachedResult = await redis.get(cacheKey);
        if (!cachedResult) {
            return res.status(404).json({ error: 'Analysis not found. Please analyze the repository first.' });
        }
        const analysis = JSON.parse(cachedResult);
        const fileAnalysis = analysis.files.find((f) => f.path === path);
        if (!fileAnalysis) {
            return res.status(404).json({ error: 'File not found in analysis' });
        }
        // Formatear el análisis para una mejor visualización
        const formattedAnalysis = {
            path: fileAnalysis.path,
            name: fileAnalysis.name,
            extension: fileAnalysis.extension,
            totalLines: fileAnalysis.totalLines,
            functionsCount: fileAnalysis.functionsCount,
            complexity: fileAnalysis.complexity,
            duplicationPercentage: fileAnalysis.duplicationPercentage,
            lastModified: fileAnalysis.lastModified,
            functions: fileAnalysis.functions.map((func) => ({
                name: func.name,
                complexity: func.complexity,
                lines: func.lines,
                startLine: func.startLine,
                fanIn: func.fanIn,
                fanOut: func.fanOut
            }))
        };
        res.json(formattedAnalysis);
    }
    catch (error) {
        console.error('Error analyzing file:', error);
        res.status(500).json({ error: 'Failed to analyze file' });
    }
});
app.post('/cache/clear', async (req, res) => {
    try {
        // Obtener todas las claves que empiezan con 'analysis:'
        const keys = await redis.keys('analysis:*');
        if (keys.length === 0) {
            return res.json({ message: 'No cached analysis found' });
        }
        // Eliminar todas las claves encontradas
        await redis.del(...keys);
        res.json({
            message: 'Cache cleared successfully',
            clearedKeys: keys.length
        });
    }
    catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});
// Start server
app.listen(port, () => {
    console.log(`🚀 API server running at http://localhost:${port}`);
});
