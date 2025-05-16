# Code Analyzer Pro - Technical Architecture

## Overview

Code Analyzer Pro is a monorepo-based code analysis tool that provides deep insights into JavaScript/TypeScript codebases. The project is organized into multiple applications and packages, each with specific responsibilities in the analysis process.

## Repository Structure

```
code-analyzer-pro/
├── apps/
│   ├── api/            # Backend API service
│   ├── cli/            # Command-line interface
│   └── web/            # Frontend web application
├── packages/
│   ├── core/           # Core analysis engine
│   ├── eslint-config-custom/  # Shared ESLint configuration
│   └── tsconfig/       # Shared TypeScript configuration
└── docs/               # Documentation
```

## System Architecture

```
[Web App] <---> [API] <---> [Redis]
                  ^
                  |
                  v
                [Core] <---> [AST Parser]
                  ^
                  |
                  v
                [CLI]
```

## Application Descriptions

### 1. Web Application (`apps/web`)

Frontend application providing the main user interface.

Features:
- Repository management
- Analysis visualization
- Report generation
- User settings

```typescript
// Web application structure
apps/web/
├── src/
│   ├── app/           # Application routes and pages
│   ├── components/    # UI components
│   ├── constants/     # Constants and configuration
│   ├── test/         # Test files
│   ├── App.tsx       # Main application component
│   ├── App.test.tsx  # Application tests
│   ├── api.ts        # API integration
│   ├── main.tsx      # Application entry point
│   ├── index.css     # Global styles
│   └── index.html    # HTML entry point
├── public/           # Static assets
├── package.json      # Dependencies and scripts
├── vite.config.ts    # Vite configuration
├── vitest.config.ts  # Test configuration
├── tsconfig.json     # TypeScript configuration
├── tsconfig.node.json # Node-specific TypeScript config
├── postcss.config.js # PostCSS configuration
└── tailwind.config.js # Tailwind CSS configuration
```

### 2. API Service (`apps/api`)

Backend service handling analysis requests and data management.

Features:
- Analysis request processing
- Repository management
- Data persistence with Redis
- Authentication/Authorization

```typescript
// API service structure
apps/api/
├── src/
│   ├── index.ts       # Main application and routes
│   ├── index.test.ts  # API tests
│   ├── server.ts      # Server setup
│   └── types/         # Type definitions
├── package.json       # Dependencies and scripts
├── tsup.config.ts     # Build configuration
├── tsconfig.json      # TypeScript configuration
└── vitest.config.ts   # Test configuration
```

Key endpoints:
- POST `/upload` - Store analysis results
- GET `/metrics/:id` - Retrieve analysis results
- GET `/analyze` - Analyze repository
- GET `/analyze/file` - Analyze specific file

### 3. CLI Application (`apps/cli`)

Command-line interface for running code analysis.

Features:
- Repository analysis
- File analysis
- Report generation
- Configuration management

```typescript
// CLI application structure
apps/cli/
├── src/
│   └── index.ts       # CLI implementation
├── package.json       # Dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## Package Descriptions

### 1. Core Package (`packages/core`)

The heart of the analysis system, providing fundamental code analysis capabilities.

Key components:
- `RepositoryAnalyzer` class for repository-level analysis
- `FunctionAnalyzer` class for function-level analysis
- `DuplicationDetector` class for code duplication detection
- `ASTTraverser` class for AST traversal
- `ContextualNamingSystem` for managing function context
- Metrics calculation

```typescript
// Core package structure
packages/core/
├── src/
│   ├── repository-analyzer.ts    # Repository analysis logic
│   ├── function-analyzer.ts      # Function analysis logic
│   ├── duplication-detector.ts   # Code duplication detection
│   ├── traverser.ts             # AST traversal logic
│   ├── contextual-naming-system.ts # Function context management
│   ├── parent-info.ts           # Parent node information utilities
│   ├── types.ts                 # Core type definitions
│   ├── types/                   # Additional type definitions
│   ├── analyzer.ts              # Main analyzer exports
│   ├── analyzer.test.ts         # Analyzer tests
│   ├── traverser.test.ts        # Traverser tests
│   └── index.ts                 # Package entry point
├── package.json                 # Dependencies and scripts
├── tsup.config.ts              # Build configuration
├── tsconfig.json               # TypeScript configuration
└── vitest.config.ts            # Test configuration
```

### 2. Shared Configurations

#### ESLint Configuration (`packages/eslint-config-custom`)
```typescript
packages/eslint-config-custom/
├── index.js          # Main configuration
├── react.js          # React-specific rules
└── package.json      # Dependencies and scripts
```

#### TypeScript Configuration (`packages/tsconfig`)
```typescript
packages/tsconfig/
├── base.json         # Base configuration
├── react.json        # React-specific config
└── package.json      # Dependencies and scripts
```

## Package Dependencies

```
core
  ↑
  ├── api
  └── cli
```

## Data Flow

1. **Web Application Flow**
   ```
   User → Web → API → Redis Cache → Core → AST Parser → Analysis Results
   ```

2. **CLI Flow**
   ```
   User → CLI → Core → AST Parser → Analysis Results
   ```

3. **Caching Flow**
   ```
   Analysis Results → API → Redis Cache (1 hour TTL) → Web Display
   ```

## Development Workflow

1. **Local Development**
   - Use `pnpm` for package management
   - Run tests with `vitest`
   - Build packages with `tsc`
   - Docker for API and Redis services

3. **Testing Strategy**
   - Unit tests for core functionality
   - Integration tests for API

## Build System

1. **Package Building**
   - TypeScript compilation
   - Bundle generation
   - Type definitions

2. **Application Building**
   - Vite for web application
   - TSC for CLI
   - Node.js for API