interface InfoButtonProps {
  info: string;
  position?: 'left' | 'center' | 'right';
}

export function InfoButton({ info, position = 'center' }: InfoButtonProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-0 transform translate-x-0';
      case 'right':
        return 'right-0 transform translate-x-0';
      default:
        return 'left-1/2 transform -translate-x-1/2';
    }
  };

  const getArrowPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-4';
      case 'right':
        return 'right-4';
      default:
        return 'left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="relative inline-block ml-1 group">
      <button
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="More information"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      <div className={`absolute z-50 hidden group-hover:block w-64 p-2 mt-1 text-sm text-white bg-gray-800 rounded-lg shadow-lg top-full ${getPositionClasses()}`}>
        <div className="relative text-center">
          {info}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 -top-1 ${getArrowPositionClasses()}`}></div>
        </div>
      </div>
    </div>
  );
} 