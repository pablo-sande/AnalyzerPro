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

## 📊 Key Metrics

- Function complexity
- Code duplication
- File size and line count
- Function dependencies
- Code quality indicators
- Performance metrics

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Core Analysis**: TypeScript, Babel Parser
- **Caching**: Redis
- **Build Tools**: tsup, TypeScript
- **Testing**: Vitest
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

# Start Redis server
# Make sure Redis is running on localhost:6379 or update the configuration

# Build the project
pnpm build

# Start the API server
cd apps/api
pnpm start
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
- `sortBy`: (optional) Sort by field (size, complexity, fanIn, fanOut, name, file)
- `sortOrder`: (optional) Sort order (asc, desc)

### Get File Analysis

```http
GET /analyze/file?url=https://github.com/username/repo&path=src/index.ts
```

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
- Real-time file analysis
- Efficient caching system
- Optimized data structures

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Babel](https://babeljs.io/) for the parser
- [Express](https://expressjs.com/) for the web framework
- [Redis](https://redis.io/) for caching
- [TypeScript](https://www.typescriptlang.org/) for type safety 