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
  CodeAnalyzer: () => CodeAnalyzer,
  calculateComplexity: () => calculateComplexity,
  parseFile: () => parseFile,
  traverse: () => traverse
});
module.exports = __toCommonJS(index_exports);

// src/analyzer.ts
var fs = __toESM(require("fs/promises"), 1);
var path = __toESM(require("path"), 1);

// src/traverser.ts
var import_parser = require("@babel/parser");
var _ContextualNamingSystem = class _ContextualNamingSystem {
  constructor() {
    this.contextStack = [];
    this.namedFunctions = /* @__PURE__ */ new Map();
    this.CACHE_KEY_SEPARATOR = "::";
  }
  generateCacheKey(node, context) {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}${this.CACHE_KEY_SEPARATOR}${context?.type || "no-context"}`;
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
    const mapping = _ContextualNamingSystem.CONTEXT_NAME_MAPPINGS[currentContext.type];
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
    const extractor = _ContextualNamingSystem.CONTEXT_EXTRACTORS[node.type];
    return extractor ? extractor(node) : null;
  }
};
// Mapeo estático de tipos de contexto a nombres de función
_ContextualNamingSystem.CONTEXT_NAME_MAPPINGS = {
  OptionalCallExpression: (ctx) => `${ctx.objectName}?.${ctx.method} callback`,
  CallExpression: (ctx) => {
    if (!ctx.method) return "anonymous";
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
  },
  JSXExpressionContainer: (ctx) => `${ctx.objectName}.${ctx.method} callback`
};
// Mapeo estático de tipos de nodo a extractores de contexto
_ContextualNamingSystem.CONTEXT_EXTRACTORS = {
  OptionalCallExpression: (node) => {
    const callee = node.callee;
    if (callee?.type === "OptionalMemberExpression") {
      return {
        type: "OptionalCallExpression",
        objectName: callee.object?.name || "object",
        method: callee.property?.name,
        isOptional: true,
        loc: node.loc
      };
    }
    return null;
  },
  CallExpression: (node) => {
    const callee = node.callee;
    if (callee?.type === "MemberExpression") {
      return {
        type: "CallExpression",
        objectName: callee.object?.name || "object",
        method: callee.property?.name,
        loc: node.loc
      };
    }
    return null;
  },
  JSXExpressionContainer: (node) => {
    const expression = node.expression;
    if (expression?.type === "CallExpression") {
      const callee = expression.callee;
      if (callee?.type === "MemberExpression") {
        return {
          type: "JSXExpressionContainer",
          objectName: callee.object?.name || "object",
          method: callee.property?.name,
          loc: node.loc
        };
      }
    }
    return null;
  }
};
var ContextualNamingSystem = _ContextualNamingSystem;
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
  if (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral" || node.type === "RegExpLiteral") {
    return;
  }
  if (options.onFunction && (node.type === "FunctionDeclaration" || node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression")) {
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
  if (options.onControlFlow && (node.type === "IfStatement" || node.type === "SwitchCase" || node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "CatchClause" || node.type === "ConditionalExpression")) {
    options.onControlFlow(node);
  }
  Object.keys(node).forEach((key) => {
    const value = node[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((child) => {
          if (child && typeof child === "object" && "type" in child) {
            traverse(child, options, node);
          }
        });
      } else if ("type" in value) {
        traverse(value, options, node);
      }
    }
  });
}
function getChildren(node) {
  const children = [];
  const childProperties = {
    Program: ["body"],
    BlockStatement: ["body"],
    FunctionDeclaration: ["body", "params"],
    ArrowFunctionExpression: ["body", "params"],
    FunctionExpression: ["body", "params"],
    IfStatement: ["consequent", "alternate"],
    SwitchCase: ["consequent"],
    ForStatement: ["init", "test", "update", "body"],
    WhileStatement: ["test", "body"],
    DoWhileStatement: ["body", "test"],
    TryStatement: ["block", "handler", "finalizer"],
    CatchClause: ["body"],
    ConditionalExpression: ["test", "consequent", "alternate"],
    CallExpression: ["arguments", "callee"],
    MemberExpression: ["object", "property"],
    ObjectExpression: ["properties"],
    ArrayExpression: ["elements"],
    JSXElement: ["openingElement", "closingElement", "children"],
    JSXExpressionContainer: ["expression"],
    VariableDeclaration: ["declarations"],
    VariableDeclarator: ["init"],
    ObjectProperty: ["value"],
    ClassMethod: ["body", "params"],
    ClassProperty: ["value"],
    ExportDefaultDeclaration: ["declaration"],
    ExportNamedDeclaration: ["declaration"],
    ClassDeclaration: ["body", "superClass"],
    ClassBody: ["body"],
    MethodDefinition: ["value", "key"],
    Property: ["value", "key"],
    AssignmentExpression: ["left", "right"],
    BinaryExpression: ["left", "right"],
    LogicalExpression: ["left", "right"],
    UnaryExpression: ["argument"],
    UpdateExpression: ["argument"],
    NewExpression: ["arguments", "callee"],
    TaggedTemplateExpression: ["tag", "quasi"],
    TemplateLiteral: ["quasis", "expressions"],
    SequenceExpression: ["expressions"],
    SpreadElement: ["argument"],
    RestElement: ["argument"],
    ArrayPattern: ["elements"],
    ObjectPattern: ["properties"],
    AssignmentPattern: ["left", "right"],
    YieldExpression: ["argument"],
    AwaitExpression: ["argument"],
    ImportDeclaration: ["specifiers", "source"],
    ImportSpecifier: ["imported", "local"],
    ImportDefaultSpecifier: ["local"],
    ImportNamespaceSpecifier: ["local"],
    ExportSpecifier: ["exported", "local"]
  };
  const properties = childProperties[node.type];
  if (properties) {
    for (const prop of properties) {
      const value = node[prop];
      if (Array.isArray(value)) {
        children.push(...value.filter(Boolean));
      } else if (value) {
        children.push(value);
      }
    }
  }
  if (node.type === "FunctionDeclaration" || node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    console.log(`Found ${children.length} children for ${node.type}:`, {
      type: node.type,
      id: node.id?.name,
      loc: node.loc,
      children: children.map((child) => ({
        type: child.type,
        loc: child.loc
      }))
    });
  }
  return children;
}
function calculateComplexity(node) {
  let complexity = 1;
  if (!node || node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral" || node.type === "RegExpLiteral") {
    return complexity;
  }
  if (node.type === "IfStatement" || node.type === "SwitchCase" || node.type === "ForStatement" || node.type === "WhileStatement" || node.type === "DoWhileStatement" || node.type === "CatchClause" || node.type === "ConditionalExpression") {
    complexity++;
  }
  const children = getChildren(node);
  for (const child of children) {
    complexity += calculateComplexity(child);
  }
  return complexity;
}
function parseFile(content) {
  return (0, import_parser.parse)(content, {
    sourceType: "module",
    plugins: [
      "jsx",
      "typescript",
      "classProperties",
      "decorators-legacy",
      "asyncGenerators",
      "functionBind",
      "functionSent",
      "dynamicImport",
      "doExpressions",
      "objectRestSpread",
      "optionalCatchBinding",
      "optionalChaining",
      ["pipelineOperator", { proposal: "minimal" }],
      "throwExpressions",
      "classPrivateProperties",
      "classPrivateMethods",
      "exportDefaultFrom",
      "exportNamespaceFrom",
      "partialApplication",
      "recordAndTuple",
      "throwExpressions",
      "topLevelAwait"
    ],
    errorRecovery: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    ranges: true,
    tokens: true
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
    this.MAX_CACHE_SIZE = 1e3;
  }
  clearCaches() {
    this.complexityCache.clear();
  }
  generateCacheKey(node) {
    return `${node.type}-${node.loc?.start.line}-${node.loc?.start.column}`;
  }
  async parseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return parseFile(content);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return null;
    }
  }
  analyzeFunction(node, filePath) {
    if (!node || !("type" in node)) return null;
    if (!["FunctionDeclaration", "ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) {
      return null;
    }
    const functionNode = node;
    const functionName = functionNode.id?.name || "anonymous";
    const functionSize = this.calculateFunctionSize(functionNode);
    const complexity = this.calculateComplexity(functionNode);
    const characteristics = this.analyzeFunctionCharacteristics(functionNode);
    return {
      name: functionName,
      type: this.determineFunctionType(functionNode),
      size: functionSize,
      complexity,
      characteristics,
      location: {
        file: filePath,
        start: functionNode.loc?.start,
        end: functionNode.loc?.end
      }
    };
  }
  analyzeFunctionCharacteristics(node) {
    const characteristics = [];
    if (node.type === "ArrowFunctionExpression") {
      characteristics.push("arrow");
    }
    if (node.async) {
      characteristics.push("async");
    }
    if (node.generator) {
      characteristics.push("generator");
    }
    const body = node.body;
    if (body) {
      if (this.containsPattern(body, "await")) {
        characteristics.push("uses-await");
      }
      if (this.containsPattern(body, "Promise")) {
        characteristics.push("uses-promises");
      }
      if (this.containsPattern(body, "useState") || this.containsPattern(body, "useEffect")) {
        characteristics.push("react-hook");
      }
      if (this.containsPattern(body, "map") || this.containsPattern(body, "filter")) {
        characteristics.push("array-operation");
      }
    }
    return characteristics;
  }
  containsPattern(node, pattern) {
    let found = false;
    traverse(node, {
      onControlFlow: (node2) => {
        if (node2.type === "Identifier" && node2.name.includes(pattern)) {
          found = true;
        }
      }
    });
    return found;
  }
  determineFunctionType(node) {
    const characteristics = this.analyzeFunctionCharacteristics(node);
    if (characteristics.includes("react-hook")) {
      return "react-hook";
    }
    if (characteristics.includes("async") || characteristics.includes("uses-promises")) {
      return "async";
    }
    if (characteristics.includes("generator")) {
      return "generator";
    }
    if (characteristics.includes("arrow")) {
      return "arrow";
    }
    return "regular";
  }
  calculateFunctionSize(node) {
    if (!node.loc) return 0;
    return node.loc.end.line - node.loc.start.line + 1;
  }
  calculateComplexity(node) {
    const cacheKey = this.generateCacheKey(node);
    if (this.complexityCache.has(cacheKey)) {
      return this.complexityCache.get(cacheKey);
    }
    let complexity = 1;
    traverse(node, {
      onControlFlow: (node2) => {
        if ([
          "IfStatement",
          "SwitchCase",
          "ForStatement",
          "WhileStatement",
          "DoWhileStatement",
          "CatchClause",
          "ConditionalExpression"
        ].includes(node2.type)) {
          complexity++;
        }
      }
    });
    if (this.complexityCache.size >= this.MAX_CACHE_SIZE) {
      this.complexityCache.clear();
    }
    this.complexityCache.set(cacheKey, complexity);
    return complexity;
  }
  async analyzeRepo(repoPath) {
    const files = await this.findFiles(repoPath);
    const functions = [];
    const fileAnalyses = [];
    for (const file of files) {
      try {
        const fileAnalysis = await this.analyzeFile(file);
        if (fileAnalysis) {
          fileAnalyses.push(fileAnalysis);
          functions.push(...fileAnalysis.functions.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.lines,
            complexity: f.complexity,
            characteristics: [],
            location: {
              file: fileAnalysis.path,
              start: { line: f.startLine, column: 0 },
              end: { line: f.startLine + f.lines, column: 0 }
            }
          })));
        }
      } catch (error) {
        console.error(`Error analyzing file ${file}:`, error);
      }
    }
    return {
      functions,
      files: fileAnalyses,
      summary: {
        totalFiles: fileAnalyses.length,
        totalLines: fileAnalyses.reduce((sum, file) => sum + file.totalLines, 0),
        totalFunctions: functions.length,
        errorCount: 0,
        functionsOver50Lines: functions.filter((f) => f.size > 50).length,
        functionsOverComplexity10: functions.filter((f) => f.complexity > 10).length,
        averageComplexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        averageDuplication: fileAnalyses.reduce((sum, file) => sum + file.duplicationPercentage, 0) / fileAnalyses.length || 0
      }
    };
  }
  async findFiles(repoPath) {
    const files = [];
    const processDirectory = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
              await processDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error);
      }
    };
    await processDirectory(repoPath);
    return files;
  }
  async analyzeFile(filePath) {
    try {
      const ast = await this.parseFile(filePath);
      if (!ast) return null;
      const fileContent = await fs.readFile(filePath, "utf-8");
      const lines = fileContent.split("\n").filter((line) => line.trim().length > 0).length;
      const functions = [];
      traverse(ast, {
        onFunction: (node) => {
          const analysis = this.analyzeFunction(node, filePath);
          if (analysis) {
            functions.push({
              name: analysis.name,
              lines: analysis.size,
              startLine: analysis.location.start?.line || 0,
              complexity: analysis.complexity,
              type: analysis.type,
              hasWarning: analysis.size > 50 || analysis.complexity > 10
            });
          }
        }
      });
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        totalLines: lines,
        functions,
        functionsCount: functions.length,
        complexity: functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length || 0,
        maxComplexity: Math.max(...functions.map((f) => f.complexity), 0),
        duplicationPercentage: 0,
        warningCount: functions.filter((f) => f.hasWarning).length,
        fileSize: stats.size
      };
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CodeAnalyzer,
  calculateComplexity,
  parseFile,
  traverse
});
//# sourceMappingURL=index.cjs.map