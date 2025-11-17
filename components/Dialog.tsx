import { useEffect } from 'react';

interface DialogProps {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
  noPadding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Dialog({
  onClose,
  children,
  maxWidth = 'md',
  maxHeight = '90vh',
  noPadding = false,
}: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const innerClasses = noPadding
    ? `bg-gray-900 rounded-lg ${maxWidthClasses[maxWidth]} w-full max-h-[${maxHeight}] overflow-hidden flex flex-col mt-4 sm:mt-0`
    : `bg-gray-900 rounded-lg ${maxWidthClasses[maxWidth]} w-full max-h-[${maxHeight}] overflow-y-auto p-4 sm:p-6 mt-4 sm:mt-0`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={innerClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
