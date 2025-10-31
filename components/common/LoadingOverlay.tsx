
import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  customText?: string | null;
  loadingType: 'generation' | 'inspiration' | null;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, customText, loadingType }) => {
  if (!isLoading) return null;

  const isGenerating = loadingType === 'generation';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white text-center p-4">
      {isGenerating ? (
        <div className="w-16 h-16 border-4 border-t-pink-500 border-r-purple-500 border-b-yellow-500 border-l-transparent rounded-full animate-spin"></div>
      ) : (
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      )}
      
      {isGenerating ? (
        <p className="mt-8 text-xl font-bold text-white">{customText}</p>
      ) : (
        <p className="mt-8 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 animated-gradient">
          {customText}
        </p>
      )}
    </div>
  );
};

export default LoadingOverlay;