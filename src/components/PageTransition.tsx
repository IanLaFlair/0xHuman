'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Terminal } from 'lucide-react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Trigger loading on route change
    setIsLoading(true);
    setProgress(0);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 100);

    // Minimum loading time of 1.5s for cinematic effect
    const timeout = setTimeout(() => {
      setProgress(100);
      clearInterval(progressInterval);
      setTimeout(() => setIsLoading(false), 200); // Short delay to show 100%
    }, 1500);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    };
  }, [pathname, searchParams]);

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center font-mono">
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
              <span>{Math.min(100, Math.round(progress))}%</span>
            </div>
          </div>
        </div>
      )}
      <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
        {children}
      </div>
    </>
  );
}
