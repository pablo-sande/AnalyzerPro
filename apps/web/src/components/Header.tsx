interface HeaderProps {
  onClearCache: () => void;
}

export function Header({ onClearCache }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-4xl font-bold text-center">Code Analyzer Pro</h1>
      <button
        onClick={onClearCache}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Clear Cache
      </button>
    </div>
  );
} 