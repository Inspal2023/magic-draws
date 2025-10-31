
import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3000); // Auto dismiss after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
      <p>{message}</p>
    </div>
  );
};

export default Toast;
