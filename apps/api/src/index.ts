import express, { Express } from 'express';
import cors from 'cors';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { CodeAnalyzer } from '@code-analyzer-pro/core';
import type { AnalysisResult, FileAnalysis, FunctionMetrics } from '@code-analyzer-pro/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const app: Express = express();
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

// Helper function to aggregate all functions from all files
function getAllFunctions(result: AnalysisResult) {
  return result.files.flatMap((file: FileAnalysis) =>
    (file.functions || []).map((func: FunctionMetrics) => ({
      ...func,
      location: {
        file: file.path
      },
      size: (func as any).size ?? func.lines ?? 0
    }))
  );
}

// Helper function to clone and analyze a GitHub repository
export async function analyzeRepo(githubUrl: string): Promise<AnalysisResult> {
  // Validate GitHub URL
  if (!githubUrl.startsWith('https://github.com/')) {
    throw new Error('Invalid GitHub repository URL');
  }

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
  
  try {
    // Clone the repository
    await execAsync(`git clone --single-branch ${githubUrl} ${tempDir}`);
    
    // Analyze the repository
    const analyzer = new CodeAnalyzer();
    const result = await analyzer.analyzeRepo(tempDir);
    
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
    const cacheKey = `analysis:${url}`;
    const cachedResult = await redis.get(cacheKey);
    let result: AnalysisResult;
    if (cachedResult) {
      result = JSON.parse(cachedResult) as AnalysisResult;
    } else {
      result = await analyzeRepo(url as string);
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    }
    // Aggregate all functions from all files
    let allFunctions = getAllFunctions(result);
    // Apply search filter if provided
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      allFunctions = allFunctions.filter(func =>
        func.location.file.toLowerCase().includes(searchTerm) ||
        func.name.toLowerCase().includes(searchTerm)
      );
    }
    // Apply sorting if provided
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      allFunctions.sort((a, b) => {
        switch (sortBy) {
          case 'size':
            return ((a.size || a.lines || 0) - (b.size || b.lines || 0)) * order;
          case 'complexity':
            return ((a.complexity || 0) - (b.complexity || 0)) * order;
          case 'fanIn':
            return ((a.fanIn || 0) - (b.fanIn || 0)) * order;
          case 'fanOut':
            return ((a.fanOut || 0) - (b.fanOut || 0)) * order;
          case 'name':
            return a.name.localeCompare(b.name) * order;
          case 'file':
            return a.location.file.localeCompare(b.location.file) * order;
          default:
            return 0;
        }
      });
    }
    res.json({
      ...result,
      functions: allFunctions
    });
  } catch (error) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ error: 'Failed to analyze repository' });
  }
});

// Endpoint para análisis detallado de un archivo
app.get('/analyze/file', async (req, res) => {
  const { url, path: filePath } = req.query;

  if (!url || !filePath) {
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
    // Find the file
    const fileAnalysis = analysis.files.find((f: FileAnalysis) => f.path === filePath);

    if (!fileAnalysis) {
      return res.status(404).json({ error: 'File not found in analysis' });
    }

    // Return all functions in the file
    res.json({
      ...fileAnalysis,
      functions: fileAnalysis.functions
    });
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

// Start the server only if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
}

export { app };
export { execAsync }; 