'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, Wifi } from 'lucide-react';
import TypewriterText from '@/components/TypewriterText';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [line1Done, setLine1Done] = useState(false);
  const [line2Done, setLine2Done] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSequenceComplete = () => {
    setTimeout(() => {
      setLine1Done(false);
      setLine2Done(false);
      setAnimationKey(prev => prev + 1);
    }, 500);
  };

  return (
    <main className="min-h-screen flex flex-col relative bg-background overflow-hidden font-mono selection:bg-primary selection:text-white">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      
      {/* Navbar */}
      <Navbar />

      {/* Main Content - Centered Terminal */}
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-4xl bg-secondary/80 border border-muted rounded-lg shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b border-muted">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center text-xs text-gray-500">root@0xHuman:~/protocol/start</div>
          </div>

          {/* Terminal Body */}
          <div className="p-12 md:p-24 flex flex-col items-center text-center space-y-8">
            <div className="space-y-2">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white mb-4">
                0x<span className="text-gray-400">Human</span>
              </h1>
              <div className="h-1 w-24 bg-primary mx-auto rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            </div>

            <div key={animationKey} className="w-60 text-left space-y-4 text-lg md:text-xl font-medium mx-auto min-h-[120px]">
              <p className="flex items-center gap-3">
                <span className="text-primary">&gt;</span> 
                <TypewriterText 
                  text="Spot the Bot." 
                  onComplete={() => setLine1Done(true)} 
                />
              </p>
              
              {line1Done && (
                <p className="flex items-center gap-3">
                  <span className="text-primary">&gt;</span> 
                  <TypewriterText 
                    text="Fake the Soul." 
                    onComplete={() => setLine2Done(true)} 
                  />
                </p>
              )}

              {line2Done && (
                <p className="flex items-center gap-3">
                  <span className="text-primary">&gt;</span> 
                  <span className="text-white font-bold bg-primary/20 px-1">
                    <TypewriterText 
                      text="Take the Pot." 
                      onComplete={handleSequenceComplete}
                    />
                  </span>
                  <span className="animate-pulse">_</span>
                </p>
              )}
            </div>

            <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              High-stakes PvP Turing Test running on-chain.
              Stake MNT. Deceive opponents. Trust no one.
            </p>

            <div className="pt-8 flex flex-col md:flex-row items-center gap-6">
              {mounted && isConnected ? (
                <Link
                  href="/arena"
                  className="bg-primary text-black font-bold py-4 px-8 rounded hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center gap-2"
                >
                  [ ENTER_ARENA ]
                </Link>
              ) : (
                <div className="custom-connect-wrapper">
                  <ConnectButton.Custom>
                    {({ openConnectModal, mounted }) => (
                      <button
                        onClick={openConnectModal}
                        disabled={!mounted}
                        className="bg-primary text-black font-bold py-4 px-8 rounded hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center gap-2"
                      >
                        <Shield className="w-5 h-5" />
                        [ CONNECT_WALLET ]
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                &gt; read_docs
              </Link>
            </div>
          </div>
          
          {/* Terminal Footer */}
          <div className="bg-muted/30 px-4 py-2 border-t border-muted flex justify-between text-[10px] text-gray-500 uppercase tracking-widest">
            <span>Mem: 64TB / Free</span>
            <span>Secured by Mantle</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 border-t border-muted/50 text-xs text-gray-600 flex flex-col md:flex-row justify-between items-center gap-4">
        <p>&copy; 2025 0xHuman Protocol. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><Cpu className="w-3 h-3" /> Documentation</a>
          <a href="#" className="hover:text-primary transition-colors">Discord</a>
          <a href="#" className="hover:text-primary transition-colors">Twitter</a>
        </div>
      </footer>
    </main>
  );
}
