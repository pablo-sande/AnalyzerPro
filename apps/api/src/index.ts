import express from 'express';
import cors from 'cors';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisResult, FileAnalysis, FunctionMetrics, CodeAnalyzer } from '@code-analyzer-pro/core';
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

// Función para verificar el espacio disponible
async function checkDiskSpace(directory: string): Promise<{ free: number; total: number }> {
  try {
    const { stdout } = await execAsync(`df -k ${directory}`);
    const lines = stdout.split('\n');
    const [, size, used, available] = lines[1].split(/\s+/);
    return {
      free: parseInt(available) * 1024, // Convertir a bytes
      total: parseInt(size) * 1024
    };
  } catch (error) {
    console.error('Error checking disk space:', error);
    throw new Error('Failed to check disk space');
  }
}

// Función para limpiar directorios temporales antiguos
async function cleanupOldTempDirs() {
  try {
    const tempBase = path.join(os.tmpdir(), 'repo-');
    const entries = await fs.readdir(os.tmpdir());
    const oldDirs = entries.filter(entry => 
      entry.startsWith('repo-') && 
      path.join(os.tmpdir(), entry) !== tempBase
    );

    for (const dir of oldDirs) {
      try {
        await fs.rm(path.join(os.tmpdir(), dir), { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to remove old temp dir ${dir}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old temp dirs:', error);
  }
}

// Helper function to clone and analyze a GitHub repository
export async function analyzeRepo(githubUrl: string): Promise<AnalysisResult> {
  // Validate GitHub URL
  if (!githubUrl.startsWith('https://github.com/')) {
    throw new Error('Invalid GitHub repository URL');
  }

  // Limpiar directorios temporales antiguos
  await cleanupOldTempDirs();

  // Verificar espacio disponible
  const { free } = await checkDiskSpace(os.tmpdir());
  const requiredSpace = 1024 * 1024 * 1024; // 1GB mínimo requerido
  if (free < requiredSpace) {
    throw new Error(`Not enough disk space. Required: 1GB, Available: ${(free / 1024 / 1024 / 1024).toFixed(2)}GB`);
  }

  // Create a temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
  
  try {
    // Clone the repository with optimizations
    try {
      // Use single branch for better performance
      await execAsync(`git clone --single-branch ${githubUrl} ${tempDir}`);
      
      // Check repository size
      const { stdout: sizeOutput } = await execAsync(`du -s ${tempDir}`);
      const sizeInMB = parseInt(sizeOutput.split('\t')[0]) / 1024;
      
      if (sizeInMB > 500) { // 500MB limit
        throw new Error(`Repository size (${sizeInMB.toFixed(2)}MB) exceeds the 500MB limit`);
      }
    } catch (error) {
      const err = error as Error & { code?: number; stderr?: string };
      if (err.code === 128) {
        if (err.stderr?.includes('No space left on device')) {
          throw new Error('Not enough disk space to clone the repository. Please free up some space and try again.');
        }
        if (err.stderr?.includes('Repository not found')) {
          throw new Error(`Repository not found: ${githubUrl}`);
        }
      }
      throw new Error(`Failed to clone repository: ${err.message}`);
    }
    
    // Analyze the repository
    const analyzer = new CodeAnalyzer();
    const result = await analyzer.analyzeRepo(tempDir);
    
    // Clean up file paths by removing the temporary directory prefix
    result.files = result.files.map((file: FileAnalysis) => ({
      ...file,
      path: file.path.replace(tempDir, '').replace(/^[\/\\]/, '') // Remove temp dir prefix and leading slash
    }));
    
    return result;
  } finally {
    // Clean up: remove the temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }
}

// Routes
app.post('/upload', async (req, res) => {
  try {
    const analysisResult: AnalysisResult = req.body;
    const id = uuidv4();

    // Store in Redis with 1 hour TTL
    await redis.setex(`analysis:${id}`, 3600, JSON.stringify(analysisResult));

    res.json({ id });
  } catch (error) {
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

    const analysis: AnalysisResult = JSON.parse(data);
    res.json(analysis);
  } catch (error) {
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
    
    let result: AnalysisResult;
    
    if (cachedResult) {
      result = JSON.parse(cachedResult) as AnalysisResult;
    } else {
      // If not in cache, clone and analyze the repository
      result = await analyzeRepo(url as string);
      // Cache the result
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // Cache for 1 hour
    }
    
    // Apply filtering and sorting to the result
    let filteredFiles = [...result.files];
    
    // Apply search filter if provided
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.path.toLowerCase().includes(searchTerm)
      );
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
          case 'size':
            return (a.fileSize - b.fileSize) * order;
          case 'warnings':
            const warningsA = a.functions.filter((f: FunctionMetrics) => f.lines > 50 || f.complexity > 10).length;
            const warningsB = b.functions.filter((f: FunctionMetrics) => f.lines > 50 || f.complexity > 10).length;
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
  } catch (error) {
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

    const analysis = JSON.parse(cachedResult) as AnalysisResult;
    const fileAnalysis = analysis.files.find((f: FileAnalysis) => f.path === path);

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
      functions: fileAnalysis.functions.map((func: FunctionMetrics) => ({
        name: func.name,
        complexity: func.complexity,
        lines: func.lines,
        startLine: func.startLine,
        fanIn: func.fanIn,
        fanOut: func.fanOut
      })),
      fileSize: fileAnalysis.fileSize
    };

    res.json(formattedAnalysis);
  } catch (error) {
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
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
}); 