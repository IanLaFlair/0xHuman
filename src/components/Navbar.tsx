'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Terminal, Wifi, Menu, X, User, LogOut } from 'lucide-react';
import CustomConnectButton from './CustomConnectButton';
import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const isActive = (path: string) => {
    return pathname === path ? 'text-white border-b border-primary' : 'text-gray-500 hover:text-gray-300';
  };

  return (
    <nav className="flex justify-between items-center p-6 border-b border-muted/50 backdrop-blur-sm z-50 relative">
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <Image 
            src="/icon.png" 
            alt="0xHuman Logo" 
            fill
            className="object-cover"
          />
        </div>
        <span className="font-bold text-xl tracking-wider text-white">0XHUMAN // TERMINAL</span>
      </div>
      
      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-6 text-xs md:text-sm">
        <Link href="/" className={`${isActive('/')} transition-colors pb-0.5`}>
          // HOME
        </Link>
        <Link href="/arena" className={`${isActive('/arena')} transition-colors pb-0.5`}>
          // ARENA
        </Link>
        <Link href="/house-pool" className={`${isActive('/house-pool')} transition-colors pb-0.5`}>
          // HOUSE POOL
        </Link>
        <Link href="/leaderboard" className={`${isActive('/leaderboard')} transition-colors pb-0.5`}>
          // LEADERBOARD
        </Link>
        <Link href="/docs" className={`${isActive('/docs')} transition-colors pb-0.5`}>
          // DOCS
        </Link>
      </div>
      
      {/* Desktop Connect & Status */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2 text-accent-green text-xs md:text-sm">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          SYSTEM: ONLINE
        </div>
        <CustomConnectButton />
      </div>

      {/* Mobile Menu Toggle */}
      <button 
        className="md:hidden text-white p-2"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full h-screen bg-black border-b border-muted/50 p-6 flex flex-col gap-6 md:hidden shadow-2xl animate-in slide-in-from-top-5 z-50">
          <Link 
            href="/" 
            className={`${isActive('/')} text-lg py-2 border-b border-gray-800`}
            onClick={() => setIsMenuOpen(false)}
          >
            // HOME
          </Link>
          <Link 
            href="/arena" 
            className={`${isActive('/arena')} text-lg py-2 border-b border-gray-800`}
            onClick={() => setIsMenuOpen(false)}
          >
            // ARENA
          </Link>
          <Link 
            href="/house-pool" 
            className={`${isActive('/house-pool')} text-lg py-2 border-b border-gray-800`}
            onClick={() => setIsMenuOpen(false)}
          >
            // HOUSE POOL
          </Link>
          <Link 
            href="/leaderboard" 
            className={`${isActive('/leaderboard')} text-lg py-2 border-b border-gray-800`}
            onClick={() => setIsMenuOpen(false)}
          >
            // LEADERBOARD
          </Link>
          <Link 
            href="/docs" 
            className={`${isActive('/docs')} text-lg py-2 border-b border-gray-800`}
            onClick={() => setIsMenuOpen(false)}
          >
            // DOCS
          </Link>

          {isConnected && (
            <>
              <Link 
                href="/profile" 
                className="text-lg py-2 border-b border-gray-800 text-gray-300 hover:text-white flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-5 h-5" />
                // MY PROFILE
              </Link>
              <button
                onClick={() => {
                  disconnect();
                  setIsMenuOpen(false);
                }}
                className="text-lg py-2 border-b border-gray-800 text-red-500 hover:text-red-400 flex items-center gap-2 text-left"
              >
                <LogOut className="w-5 h-5" />
                // DISCONNECT
              </button>
            </>
          )}

          <div className="flex flex-col gap-4 mt-4">
             <div className="flex items-center gap-2 text-accent-green text-sm">
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              SYSTEM: ONLINE
            </div>
            {/* Only show CustomConnectButton if NOT connected (to show Connect Wallet button) */}
            {/* OR if connected, CustomConnectButton will be empty on mobile due to our CSS changes, so it's safe to render */}
            <CustomConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
}
