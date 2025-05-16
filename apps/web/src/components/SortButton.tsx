interface SortButtonProps<T extends string> {
  field: T;
  label: string;
  currentSort: { field: T; order: 'asc' | 'desc' };
  onSort: (field: T) => void;
}

export function SortButton<T extends string>({ 
  field, 
  label, 
  currentSort, 
  onSort 
}: SortButtonProps<T>) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-blue-500"
    >
      {label}
      {currentSort.field === field && (
        <span className="text-sm">
          {currentSort.order === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
} 