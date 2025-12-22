'use client';

import { Loader2 } from 'lucide-react';

interface TransactionOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
}

export default function TransactionOverlay({ 
  isVisible, 
  message = "PROCESSING TRANSACTION",
  subMessage = "Waiting for blockchain confirmation..."
}: TransactionOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center space-y-6 p-8">
        {/* Animated Logo/Spinner */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
          <div className="absolute inset-2 border-4 border-primary/50 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-4 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-widest font-mono">
            {message}
          </h2>
          <p className="text-gray-400 text-sm font-mono">
            {subMessage}
          </p>
        </div>

        {/* Progress Bar Animation */}
        <div className="w-64 mx-auto h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-pulse" style={{ 
            animation: 'loading-bar 2s ease-in-out infinite',
            width: '50%'
          }} />
        </div>

        {/* Tip */}
        <p className="text-gray-500 text-xs font-mono max-w-sm mx-auto">
          Do not close this window. The transaction is being processed on the Mantle network.
        </p>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
