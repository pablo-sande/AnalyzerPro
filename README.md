# Code Analyzer Pro

A powerful code analysis tool that helps you understand and improve your codebase quality.

## Features

- 🔍 Scan local repositories for code analysis
- 📊 Calculate key metrics:
  - Function complexity
  - Code duplication
  - Function length
  - Fan-in/Fan-out
- 🌐 Beautiful web dashboard with charts and tables
- ⚡ Fast and efficient analysis using AST parsing
- 🔄 Real-time results with Redis caching

## Project Structure

```
code-analyzer-pro/
├ apps/
│ ├ cli/            # CLI tool for scanning repositories
│ ├ api/            # Express + Redis API server
│ └ web/            # React dashboard
├ packages/
│ └ core/           # Core analysis functionality
```

## Prerequisites

- Node.js 16+
- pnpm
- Redis server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/code-analyzer-pro.git
cd code-analyzer-pro
```

2. Install dependencies:
```bash
pnpm install
```

3. Build all packages:
```bash
pnpm build
```

## Usage

1. Start the API server:
```bash
cd apps/api
pnpm start
```

2. Start the web dashboard:
```bash
cd apps/web
pnpm dev
```

3. Use the CLI to analyze a repository:
```bash
cd apps/cli
pnpm start scan /path/to/repo
```

## Development

- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
- `pnpm dev` - Start development servers

## License

MIT 