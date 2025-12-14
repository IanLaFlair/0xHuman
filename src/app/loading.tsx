'use client';

import { Loader2, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center font-mono">
      <div className="w-64">
        <div className="flex items-center gap-2 mb-4 text-primary animate-pulse">
          <Terminal className="w-5 h-5" />
          <span className="font-bold tracking-widest">INITIALIZING_PROTOCOL</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-secondary/30 rounded overflow-hidden mb-2">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-[10px] text-gray-500 uppercase">
          <span>Loading Assets...</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
