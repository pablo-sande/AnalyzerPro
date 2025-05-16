interface InfoFieldProps {
  label: string;
  value: string | number;
  className?: string;
}

export function InfoField({ label, value, className }: InfoFieldProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-sm ${className || ''} ${label === 'Path' ? 'overflow-x-auto whitespace-nowrap' : ''}`}>
        {value}
      </div>
    </div>
  );
} 