interface RepositoryInputProps {
  url: string;
  loading: boolean;
  onUrlChange: (url: string) => void;
  onAnalyze: () => void;
}

export function RepositoryInput({ url, loading, onUrlChange, onAnalyze }: RepositoryInputProps) {
  return (
    <div className="flex gap-4">
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && url) {
            onAnalyze();
          }
        }}
        placeholder="Enter repository URL..."
        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onAnalyze}
        disabled={loading || !url}
        className="px-6 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
} 