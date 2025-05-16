# Code Analyzer Pro

A powerful code analysis tool that provides deep insights into your codebase's structure, complexity, and quality metrics.

## 🚀 Features

- **Fast Repository Analysis**: Analyze entire repositories in seconds
- **Complexity Metrics**: Calculate cyclomatic complexity, fan-in, fan-out
- **Function Analysis**: Detailed analysis of functions, methods, and hooks
- **Code Quality Metrics**: Identify potential issues and code smells
- **Modern Tech Stack**: Built with TypeScript, Node.js, and Express
- **Real-time Analysis**: Get instant feedback on your code
- **Caching System**: Redis-based caching for faster repeated analyses
- **API-First Design**: Easy integration with other tools and services
- **Advanced UI**: Modern React-based interface with sorting and filtering
- **Function Type Detection**: Automatic detection of function types (function, method, promise, array, hook, callback)
- **Warning System**: Highlights complex functions and long methods

## 📊 Key Metrics

- Function complexity
- Code duplication
- File size and line count
- Function dependencies
- Code quality indicators
- Performance metrics
- Function type distribution
- Warning counts

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Core Analysis**: TypeScript, Babel Parser
- **Frontend**: React, TailwindCSS
- **Caching**: Redis
- **Build Tools**: tsup, TypeScript
- **Testing**: Vitest, Testing Library
- **Linting**: ESLint

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/code-analyzer-pro.git

# Install dependencies
pnpm install

# Build the project
pnpm build

# Start Redis server
docker compose up -d redis

# To stop Redis
docker compose down

# Start the API server
cd apps/api
pnpm start

# Start the web interface
cd apps/web
pnpm run dev
```

### Environment Variables

Create a `.env` file in the `apps/api` directory:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 📚 API Endpoints

### Analyze Repository

```http
GET /analyze?url=https://github.com/username/repo
```

Query Parameters:
- `url`: GitHub repository URL
- `search`: (optional) Search term for filtering functions
- `sortBy`: (optional) Sort by field (size, complexity, fanIn, fanOut, name, file, type)
- `sortOrder`: (optional) Sort order (asc, desc)

### Get File Analysis

```http
GET /analyze/file?url=https://github.com/username/repo&path=src/index.ts
```

Query Parameters:
- `url`: GitHub repository URL
- `path`: Path to the file in the repository
- `sortField`: (optional) Sort by field (name, type, startLine, complexity, lines)
- `sortOrder`: (optional) Sort order (asc, desc)

### Clear Cache

```http
POST /cache/clear
```

## 🏗️ Project Structure

```
code-analyzer-pro/
├── apps/
│   ├── api/          # API server
│   ├── cli/          # Command-line interface
│   └── web/          # Web interface
├── packages/
│   ├── core/         # Core analysis engine
│   └── ui/           # Shared UI components
└── package.json
```

## 📈 Performance

- Repository Analysis: ~30 seconds for large repositories
- Efficient caching system
- Advanced algorithms for code analysis
- Optimized data structures
- Parallel processing of files
- Incremental analysis support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
