'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Wifi } from 'lucide-react';
import CustomConnectButton from './CustomConnectButton';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'text-white border-b border-primary' : 'text-gray-500 hover:text-gray-300';
  };

  return (
    <nav className="flex justify-between items-center p-6 border-b border-muted/50 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2">
        <div className="bg-primary p-1 rounded-sm">
          <Terminal className="w-5 h-5 text-black" />
        </div>
        <span className="font-bold text-xl tracking-wider text-white">0XHUMAN // TERMINAL</span>
      </div>
      
      <div className="flex items-center gap-6 text-xs md:text-sm">
        <Link href="/" className={`${isActive('/')} transition-colors pb-0.5`}>
          // HOME
        </Link>
        <Link href="/arena" className={`${isActive('/arena')} transition-colors pb-0.5`}>
          // ARENA
        </Link>
        <Link href="/leaderboard" className={`${isActive('/leaderboard')} transition-colors pb-0.5`}>
          // LEADERBOARD
        </Link>
        <Link href="/docs" className={`${isActive('/docs')} transition-colors pb-0.5`}>
          // DOCS
        </Link>
        

      </div>
      
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2 text-accent-green text-xs md:text-sm">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          SYSTEM: ONLINE
        </div>
        <CustomConnectButton />
      </div>
    </nav>
  );
}
