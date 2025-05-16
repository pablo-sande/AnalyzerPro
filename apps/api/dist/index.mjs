// src/index.ts
import express from "express";
import cors from "cors";
import { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { CodeAnalyzer } from "@code-analyzer-pro/core";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
var execAsync = promisify(exec);
var app = express();
var port = process.env.PORT || 3e3;
var redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379")
});
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
function getAllFunctions(result) {
  return result.files.flatMap(
    (file) => (file.functions || []).map((func) => ({
      ...func,
      location: {
        file: file.path
      },
      size: func.size ?? func.lines ?? 0
    }))
  );
}
async function analyzeRepo(githubUrl) {
  if (!githubUrl.startsWith("https://github.com/")) {
    throw new Error("Invalid GitHub repository URL");
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
  try {
    await execAsync(`git clone --single-branch ${githubUrl} ${tempDir}`);
    const analyzer = new CodeAnalyzer();
    const result = await analyzer.analyzeRepo(tempDir);
    return result;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up temp directory:", error);
    }
  }
}
app.post("/upload", async (req, res) => {
  try {
    const analysisResult = req.body;
    const id = uuidv4();
    await redis.setex(`analysis:${id}`, 3600, JSON.stringify(analysisResult));
    res.json({ id });
  } catch (error) {
    console.error("Error storing analysis:", error);
    res.status(500).json({ error: "Failed to store analysis" });
  }
});
app.get("/metrics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await redis.get(`analysis:${id}`);
    if (!data) {
      return res.status(404).json({ error: "Analysis not found or expired" });
    }
    const analysis = JSON.parse(data);
    res.json(analysis);
  } catch (error) {
    console.error("Error retrieving analysis:", error);
    res.status(500).json({ error: "Failed to retrieve analysis" });
  }
});
app.get("/analyze", async (req, res) => {
  try {
    const { url, search, sortBy, sortOrder } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    const cacheKey = `analysis:${url}`;
    const cachedResult = await redis.get(cacheKey);
    let result;
    if (cachedResult) {
      result = JSON.parse(cachedResult);
    } else {
      result = await analyzeRepo(url);
      await redis.set(cacheKey, JSON.stringify(result), "EX", 3600);
    }
    let allFunctions = getAllFunctions(result);
    if (search) {
      const searchTerm = search.toLowerCase();
      allFunctions = allFunctions.filter(
        (func) => func.location.file.toLowerCase().includes(searchTerm) || func.name.toLowerCase().includes(searchTerm)
      );
    }
    if (sortBy) {
      const order = sortOrder === "desc" ? -1 : 1;
      allFunctions.sort((a, b) => {
        switch (sortBy) {
          case "size":
            return ((a.size || a.lines || 0) - (b.size || b.lines || 0)) * order;
          case "complexity":
            return ((a.complexity || 0) - (b.complexity || 0)) * order;
          case "fanIn":
            return ((a.fanIn || 0) - (b.fanIn || 0)) * order;
          case "fanOut":
            return ((a.fanOut || 0) - (b.fanOut || 0)) * order;
          case "name":
            return a.name.localeCompare(b.name) * order;
          case "file":
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
    console.error("Error analyzing repository:", error);
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});
app.get("/analyze/file", async (req, res) => {
  const { url, path: filePath } = req.query;
  if (!url || !filePath) {
    return res.status(400).json({ error: "URL and path are required" });
  }
  try {
    const cacheKey = `analysis:${url}`;
    const cachedResult = await redis.get(cacheKey);
    if (!cachedResult) {
      return res.status(404).json({ error: "Analysis not found. Please analyze the repository first." });
    }
    const analysis = JSON.parse(cachedResult);
    const fileAnalysis = analysis.files.find((f) => f.path === filePath);
    if (!fileAnalysis) {
      return res.status(404).json({ error: "File not found in analysis" });
    }
    res.json({
      ...fileAnalysis,
      functions: fileAnalysis.functions
    });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ error: "Failed to analyze file" });
  }
});
app.post("/cache/clear", async (req, res) => {
  try {
    const keys = await redis.keys("analysis:*");
    if (keys.length === 0) {
      return res.json({ message: "No cached analysis found" });
    }
    await redis.del(...keys);
    res.json({
      message: "Cache cleared successfully",
      clearedKeys: keys.length
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
export {
  analyzeRepo,
  app,
  execAsync
};
//# sourceMappingURL=index.mjs.map