interface FileSearchProps {
  onSearch: (value: string) => void;
}

export function FileSearch({ onSearch }: FileSearchProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search files..."
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
} 