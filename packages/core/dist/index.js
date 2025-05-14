"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CodeAnalyzer: () => CodeAnalyzer
});
module.exports = __toCommonJS(index_exports);

// src/analyzer.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);

// src/traverser.ts
var import_parser = require("@babel/parser");
var ContextualNamingSystem = class {
  constructor() {
    this.contextStack = [];
    this.namedFunctions = /* @__PURE__ */ new Map();
    this.targetFile = null;
    this.CACHE_KEY_SEPARATOR = "::";
  }
  generateCacheKey(node, context) {
    const nodeId = `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
    const contextId = context ? `${context.type}-${context.method || ""}-${context.objectName || ""}` : "no-context";
    return `${nodeId}${this.CACHE_KEY_SEPARATOR}${contextId}`;
  }
  pushContext(context) {
    if (this.contextStack.length > 0) {
      context.parent = this.contextStack[this.contextStack.length - 1];
    }
    this.contextStack.push(context);
  }
  popContext() {
    this.contextStack.pop();
  }
  getCurrentContext() {
    return this.contextStack[this.contextStack.length - 1];
  }
  generateName(node, parent) {
    const currentContext = this.getCurrentContext();
    const cacheKey = this.generateCacheKey(node, currentContext);
    const cachedName = this.namedFunctions.get(cacheKey);
    if (cachedName) {
      return cachedName;
    }
    if (!currentContext) {
      return "anonymous";
    }
    const contextNameMappings = {
      OptionalCallExpression: (ctx) => `${ctx.objectName}?.${ctx.method} callback`,
      CallExpression: (ctx) => {
        if (ctx.method) {
          if (["then", "catch", "finally"].includes(ctx.method)) {
            return `${ctx.method} handler`;
          }
          if (["map", "filter", "forEach", "find", "some", "every", "reduce"].includes(ctx.method)) {
            return `${ctx.method} callback`;
          }
          if (ctx.method.startsWith("use")) {
            return `${ctx.method} callback`;
          }
          return `${ctx.objectName}.${ctx.method} callback`;
        }
        return "anonymous";
      },
      JSXExpressionContainer: (ctx) => `${ctx.objectName}.${ctx.method} callback`
    };
    const mapping = contextNameMappings[currentContext.type];
    let name = "anonymous";
    if (mapping) {
      name = mapping(currentContext);
    } else if (node.type === "FunctionDeclaration" && node.id?.name) {
      name = node.id.name;
    }
    this.namedFunctions.set(cacheKey, name);
    return name;
  }
  extractContextFromNode(node) {
    const contextExtractors = {
      OptionalCallExpression: (node2) => {
        const callee = node2.callee;
        if (callee?.type === "OptionalMemberExpression") {
          return {
            type: "OptionalCallExpression",
            objectName: callee.object?.name || "object",
            method: callee.property?.name,
            isOptional: true,
            loc: node2.loc ? {
              start: { line: node2.loc.start.line, column: node2.loc.start.column },
              end: { line: node2.loc.end.line, column: node2.loc.end.column }
            } : null
          };
        }
        return null;
      },
      CallExpression: (node2) => {
        const callee = node2.callee;
        if (callee?.type === "MemberExpression") {
          return {
            type: "CallExpression",
            objectName: callee.object?.name || "object",
            method: callee.property?.name,
            loc: node2.loc ? {
              start: { line: node2.loc.start.line, column: node2.loc.start.column },
              end: { line: node2.loc.end.line, column: node2.loc.end.column }
            } : null
          };
        }
        return null;
      },
      JSXExpressionContainer: (node2) => {
        const expression = node2.expression;
        if (expression?.type === "CallExpression") {
          const callee = expression.callee;
          if (callee?.type === "MemberExpression") {
            return {
              type: "JSXExpressionContainer",
              objectName: callee.object?.name || "object",
              method: callee.property?.name,
              loc: node2.loc ? {
                start: { line: node2.loc.start.line, column: node2.loc.start.column },
                end: { line: node2.loc.end.line, column: node2.loc.end.column }
              } : null
            };
          }
        }
        return null;
      }
    };
    const extractor = contextExtractors[node.type];
    if (extractor) {
      const context = extractor(node);
      if (context) {
        return context;
      }
    }
    return null;
  }
};
function getParentInfo(parent) {
  if (!parent) return void 0;
  const nameMappings = {
    VariableDeclarator: (p) => ({ type: "VariableDeclarator", key: p.id?.name }),
    ObjectProperty: (p) => ({ type: "ObjectProperty", key: p.key?.name }),
    ClassMethod: (p) => ({ type: "ClassMethod", key: p.key?.name }),
    AssignmentExpression: (p) => ({ type: "AssignmentExpression", key: p.left?.name }),
    ExportDefaultDeclaration: () => ({ type: "ExportDefaultDeclaration", key: "default" }),
    ObjectMethod: (p) => ({ type: "ObjectMethod", key: p.key?.name }),
    ClassProperty: (p) => ({ type: "ClassProperty", key: p.key?.name }),
    JSXAttribute: (p) => ({ type: "JSXAttribute", key: p.name?.name })
  };
  const mapping = nameMappings[parent.type];
  if (mapping) {
    return mapping(parent);
  }
  if (parent.type === "ExportNamedDeclaration") {
    const declaration = parent.declaration;
    if (declaration) {
      if (declaration.type === "VariableDeclaration") {
        const firstDeclarator = declaration.declarations[0];
        if (firstDeclarator?.id?.name) {
          return { type: "ExportNamedDeclaration", key: firstDeclarator.id.name };
        }
      } else if (declaration.id?.name) {
        return { type: "ExportNamedDeclaration", key: declaration.id.name };
      }
    }
  }
  if (parent.type === "CallExpression") {
    const callee = parent.callee;
    if (callee?.type === "Identifier") {
      return {
        type: "CallExpression",
        key: callee.name,
        method: callee.name,
        value: `${callee.name} callback`
      };
    } else if (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") {
      const methodName = callee.property?.name || "unknown";
      const objectName = callee.object?.name || "object";
      const isOptional = callee.type === "OptionalMemberExpression";
      return {
        type: "CallExpression",
        key: objectName,
        method: methodName,
        isOptional,
        value: `${methodName} callback`
      };
    }
  }
  return void 0;
}
function traverse(node, options, parent) {
  if (!node) return;
  const namingSystem = new ContextualNamingSystem();
  if ((node.type === "FunctionDeclaration" || node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") && options.onFunction) {
    const parentInfo = getParentInfo(parent);
    const context = namingSystem.extractContextFromNode(parent);
    if (context) {
      namingSystem.pushContext(context);
    }
    let functionName = "anonymous";
    if (node.type === "FunctionDeclaration" && node.id?.name) {
      functionName = node.id.name;
    } else if (parentInfo) {
      if (parentInfo.type === "CallExpression") {
        functionName = parentInfo.value || `${parentInfo.method} callback`;
      } else if (parentInfo.key) {
        functionName = parentInfo.key;
      }
    } else if (context) {
      functionName = namingSystem.generateName(node, parent);
    }
    if ((node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") && functionName !== "anonymous") {
      node.id = { type: "Identifier", name: functionName };
    }
    options.onFunction(node, {
      type: parent?.type || "unknown",
      key: parentInfo?.key || functionName,
      method: context?.method,
      isOptional: context?.isOptional,
      value: functionName
    });
    if (context) {
      namingSystem.popContext();
    }
  }
  if ((node.type === "IfStatement" || node.type === "SwitchCase" || node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "CatchClause" || node.type === "ConditionalExpression") && options.onControlFlow) {
    options.onControlFlow(node);
  }
  for (const key in node) {
    const value = node[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((child) => traverse(child, options, node));
      } else if (value.type) {
        traverse(value, options, node);
      }
    }
  }
}
function calculateComplexity(node) {
  let complexity = 1;
  traverse(node, {
    onControlFlow: () => {
      complexity++;
    }
  });
  return complexity;
}
function parseFile(content) {
  return (0, import_parser.parse)(content, {
    sourceType: "module",
    plugins: ["typescript", "jsx"]
  });
}

// src/analyzer.ts
var CodeAnalyzer = class {
  constructor() {
    this.ARRAY_METHODS = ["map", "filter", "forEach", "find", "some", "every", "reduce"];
    this.PROMISE_METHODS = ["then", "catch", "finally"];
    this.REACT_HOOKS = ["useEffect", "useCallback", "useMemo", "useState", "useRef", "useContext"];
    this.COMPLEXITY_THRESHOLD = 10;
    this.LINES_THRESHOLD = 50;
    this.DUPLICATION_THRESHOLD = 0.8;
    this.CACHE_SIZE = 1e3;
    this.FUNCTION_TYPES = {
      METHOD: "method",
      PROMISE: "promise",
      ARRAY: "array",
      HOOK: "hook",
      CALLBACK: "callback",
      FUNCTION: "function"
    };
    this.complexityCache = /* @__PURE__ */ new Map();
    this.fanInCache = /* @__PURE__ */ new Map();
    this.fanOutCache = /* @__PURE__ */ new Map();
  }
  clearCaches() {
    this.complexityCache.clear();
    this.fanInCache.clear();
    this.fanOutCache.clear();
  }
  getCacheKey(node) {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
  }
  async parseFile(filePath) {
    this.clearCaches();
    const content = await fs.promises.readFile(filePath, "utf-8");
    if (content.length > 1024 * 1024) {
      console.warn(`File ${filePath} is too large (${content.length} bytes), skipping detailed analysis`);
      return {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        totalLines: content.split("\n").length,
        functions: [],
        functionsCount: 0,
        complexity: 0,
        maxComplexity: 0,
        averageFanIn: 0,
        averageFanOut: 0,
        duplicationPercentage: 0,
        warningCount: 0,
        fileSize: content.length
      };
    }
    const ast = parseFile(content);
    const functions = [];
    const lines = content.split("\n");
    const totalLines = lines.length;
    let totalComplexity = 0;
    let maxComplexity = 0;
    let totalFanIn = 0;
    let totalFanOut = 0;
    let totalWarnings = 0;
    let totalDuplication = 0;
    const uniqueLines = new Set(lines.map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*")));
    traverse(ast, {
      onFunction: (node, parent) => {
        let functionName = "anonymous";
        let functionType = this.FUNCTION_TYPES.FUNCTION;
        if ("id" in node && node.id) {
          functionName = node.id.name;
        } else if (parent && (parent.type === "ClassMethod" || parent.type === "ObjectProperty")) {
          functionName = parent.key || "anonymous";
          functionType = this.FUNCTION_TYPES.METHOD;
        } else if (parent && parent.type === "VariableDeclarator") {
          functionName = parent.key || "anonymous";
        } else if (parent && parent.type === "CallExpression") {
          const findClosestHook = (node2) => {
            if (!node2) return null;
            if (node2.type === "CallExpression" && node2.callee?.type === "Identifier" && this.REACT_HOOKS.includes(node2.callee.name)) {
              return node2.callee.name;
            }
            if (node2.parent?.type === "CallExpression" && node2.parent.callee?.type === "Identifier" && this.REACT_HOOKS.includes(node2.parent.callee.name)) {
              return node2.parent.callee.name;
            }
            return findClosestHook(node2.parent);
          };
          const hookName = findClosestHook(node);
          if (hookName) {
            functionName = `${hookName} callback`;
            functionType = this.FUNCTION_TYPES.HOOK;
          } else if (parent.method) {
            if (this.PROMISE_METHODS.includes(parent.method)) {
              functionName = `${parent.method} handler`;
              functionType = this.FUNCTION_TYPES.PROMISE;
            } else if (this.ARRAY_METHODS.includes(parent.method)) {
              functionName = `${parent.method} callback`;
              functionType = this.FUNCTION_TYPES.ARRAY;
            } else {
              functionName = `${parent.method} callback`;
              functionType = this.FUNCTION_TYPES.CALLBACK;
            }
          } else if (parent.key) {
            functionName = `${parent.key} callback`;
            functionType = this.FUNCTION_TYPES.CALLBACK;
          } else {
            functionName = "anonymous callback";
            functionType = this.FUNCTION_TYPES.CALLBACK;
          }
        }
        const cacheKey = this.getCacheKey(node);
        let complexity2 = this.complexityCache.get(cacheKey);
        if (complexity2 === void 0) {
          complexity2 = calculateComplexity(node);
          this.complexityCache.set(cacheKey, complexity2);
        }
        const functionLines = node.loc ? node.loc.end.line - node.loc.start.line + 1 : 0;
        const startLine = node.loc ? node.loc.start.line : 0;
        totalComplexity += complexity2;
        maxComplexity = Math.max(maxComplexity, complexity2);
        let fanIn = this.fanInCache.get(cacheKey);
        if (fanIn === void 0) {
          fanIn = this.calculateFanIn(node, ast);
          this.fanInCache.set(cacheKey, fanIn);
        }
        let fanOut = this.fanOutCache.get(cacheKey);
        if (fanOut === void 0) {
          fanOut = this.calculateFanOut(node, ast);
          this.fanOutCache.set(cacheKey, fanOut);
        }
        totalFanIn += fanIn;
        totalFanOut += fanOut;
        const hasWarning = functionLines > this.LINES_THRESHOLD || complexity2 > this.COMPLEXITY_THRESHOLD;
        if (hasWarning) {
          totalWarnings++;
        }
        const functionContent = lines.slice(
          (node.loc?.start.line || 1) - 1,
          node.loc?.end.line || 1
        ).join("\n");
        const duplication = this.calculateFunctionDuplication(functionContent);
        totalDuplication += duplication;
        const functionInfo = {
          name: functionName,
          lines: functionLines,
          startLine,
          complexity: complexity2,
          fanIn,
          fanOut,
          type: functionType,
          hasWarning
        };
        functions.push(functionInfo);
      }
    });
    const stats = await fs.promises.stat(filePath);
    const complexity = functions.length > 0 ? totalComplexity / functions.length : 0;
    const duplicationPercentage = functions.length > 0 ? totalDuplication / functions.length : 0;
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath),
      totalLines,
      functions,
      functionsCount: functions.length,
      complexity,
      maxComplexity,
      averageFanIn: functions.length > 0 ? totalFanIn / functions.length : 0,
      averageFanOut: functions.length > 0 ? totalFanOut / functions.length : 0,
      duplicationPercentage,
      warningCount: totalWarnings,
      fileSize: stats.size
    };
  }
  calculateFanIn(node, ast) {
    let fanIn = 0;
    traverse(ast, {
      onFunction: (funcNode) => {
        if (funcNode !== node && this.hasReferenceToNode(funcNode, node)) {
          fanIn++;
        }
      }
    });
    return fanIn;
  }
  calculateFanOut(node, ast) {
    let fanOut = 0;
    traverse(ast, {
      onControlFlow: (controlNode) => {
        if (this.isNodeInsideFunction(controlNode, node) && controlNode.type === "CallExpression") {
          fanOut++;
        }
      }
    });
    return fanOut;
  }
  hasReferenceToNode(node, targetNode) {
    if (!node || !targetNode) return false;
    if (node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee?.name === targetNode.id?.name) {
      return true;
    }
    return false;
  }
  isNodeInsideFunction(node, functionNode) {
    if (!node.loc || !functionNode.loc) return false;
    return node.loc.start.line >= functionNode.loc.start.line && node.loc.end.line <= functionNode.loc.end.line;
  }
  calculateFunctionDuplication(content) {
    const lines = content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*"));
    if (lines.length === 0) return 0;
    const uniqueLines = new Set(lines);
    return (lines.length - uniqueLines.size) / lines.length;
  }
  async analyzeRepo(repoPath) {
    const files = [];
    const jsExtensions = [".js", ".jsx", ".ts", ".tsx"];
    const BATCH_SIZE = 50;
    let currentBatch = [];
    const processDirectory = async (dirPath) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build") {
          await processDirectory(fullPath);
        } else if (entry.isFile() && jsExtensions.includes(path.extname(entry.name)) && !entry.name.includes("dist") && !entry.name.includes("build") && !entry.name.includes("_astro") && !entry.name.includes("mocks")) {
          currentBatch.push(fullPath);
          if (currentBatch.length >= BATCH_SIZE) {
            await processBatch();
          }
        }
      }
    };
    const processBatch = async () => {
      if (currentBatch.length === 0) return;
      const batchResults = await Promise.all(
        currentBatch.map(async (filePath) => {
          try {
            return await this.parseFile(filePath);
          } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error);
            return null;
          }
        })
      );
      files.push(...batchResults.filter((result) => result !== null));
      currentBatch = [];
    };
    await processDirectory(repoPath);
    await processBatch();
    const summary = {
      totalFiles: files.length,
      totalLines: files.reduce((sum, file) => sum + file.totalLines, 0),
      functionsOver50Lines: files.reduce((sum, file) => sum + file.functions.filter((f) => f.lines > 50).length, 0),
      functionsOverComplexity10: files.reduce((sum, file) => sum + file.functions.filter((f) => f.complexity > 10).length, 0),
      averageComplexity: files.reduce((sum, file) => sum + file.functions.reduce((fSum, f) => fSum + f.complexity, 0), 0) / files.reduce((sum, file) => sum + file.functions.length, 0),
      averageDuplication: files.reduce((sum, file) => sum + file.duplicationPercentage, 0) / files.length
    };
    return { files, summary };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CodeAnalyzer
});
//# sourceMappingURL=index.js.map