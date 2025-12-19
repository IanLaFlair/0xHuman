'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Users, Zap, Trophy, Shield, Terminal, ArrowRight, Swords } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useCreateGame, useJoinGame, useFindMatch } from '@/hooks/useOxHuman';
import { decodeEventLog } from 'viem';
import OxHumanABI from '@/contracts/OxHumanABI.json';

export default function ArenaPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedArena, setSelectedArena] = useState<string | null>(null);
  const [targetGameId, setTargetGameId] = useState<number | null>(null);
  
  const { createGame, isPending: isCreating, isConfirming: isConfirmingCreate, isConfirmed: isCreated, hash: createHash, receipt: createReceipt } = useCreateGame();
  const { joinGame, isPending: isJoining, isConfirming: isConfirmingJoin, isConfirmed: isJoined, hash: joinHash } = useJoinGame();
  const { findMatch } = useFindMatch();


  // Combine loading states
  const isPending = isCreating || isJoining;
  const isConfirming = isConfirmingCreate || isConfirmingJoin;
  const isConfirmed = isCreated || isJoined;
  const hash = createHash || joinHash;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConfirmed && hash) {
      // If we have a targetGameId (from joining), use it
      if (targetGameId !== null) {
        router.push(`/game/${targetGameId}`);
        return;
      }

      // If we created a game, we need to find the GameId from logs
      // For now, if we don't have it, we can try to fetch the latest game or just redirect to a default
      // But since we are in a "Dice Roll" flow, if we created a game, it's likely the latest one.
      // A safer bet for now without parsing logs is to redirect to /game/latest or handle it better.
      // However, for this fix, let's assume if we joined, we have ID. If created, we might need to wait or check logs.
      
      // Attempt to parse logs if available
      if (createReceipt) {
         let newGameId = null;
         try {
           for (const log of createReceipt.logs) {
             try {
               const event = decodeEventLog({
                 abi: OxHumanABI,
                 data: log.data,
                 topics: log.topics,
               });
               if (event.eventName === 'GameCreated') {
                 newGameId = (event.args as any).gameId;
                 break;
               }
             } catch (e) {
               // Ignore logs that don't match ABI
             }
           }
         } catch (err) {
           console.error("Error parsing logs:", err);
         }

         const targetId = newGameId ? Number(newGameId) : 1;
         const stake = selectedArena ? arenas.find(a => a.id === selectedArena)?.stake : '50';
         
         console.log("Game Created! Redirecting to:", targetId);
         router.push(`/game/${targetId}?stake=${stake}`); 
      } else if (targetGameId) {
         const stake = selectedArena ? arenas.find(a => a.id === selectedArena)?.stake : '50';
         router.push(`/game/${targetGameId}?stake=${stake}`);
      }
    }
  }, [isConfirmed, hash, router, targetGameId, createReceipt]);

  const arenas = [
    {
      id: 'playground',
      title: 'THE PLAYGROUND',
      stake: '2',
      label: 'SIMULATION',
      features: ['Low Risk Environment', 'Training Ground', 'Newbie Friendly'],
      color: 'border-gray-700',
      hover: 'hover:border-gray-500',
      icon: <Terminal className="w-5 h-5" />
    },
    {
      id: 'pit',
      title: 'THE PIT',
      stake: '10',
      label: 'COMBAT',
      features: ['Medium Stakes', 'Combat Zone Active', 'Experienced Agents'],
      color: 'border-primary',
      hover: 'hover:border-blue-400',
      recommended: true,
      icon: <Swords className="w-5 h-5" />
    },
    {
      id: 'hightable',
      title: 'HIGH TABLE',
      stake: '100',
      label: 'ELITE',
      features: ['Maximum Risk', 'Elite Only', 'High Reward'],
      color: 'border-red-900',
      hover: 'hover:border-red-700',
      icon: <Trophy className="w-5 h-5" />
    }
  ];

  const handleInitialize = async () => {
    if (!selectedArena) return;
    const arena = arenas.find(a => a.id === selectedArena);
    if (!arena) return;

    // Reset state
    setTargetGameId(null);

    // 1. Roll Dice (0-100)
    const diceRoll = Math.floor(Math.random() * 100);
    console.log("Dice Roll:", diceRoll);

    // 2. Path A: AI Path (Dice < 50) -> Create Game directly
    if (diceRoll < 50) {
      console.log("Path: AI (Create Game)");
      createGame(arena.stake);
      return;
    }

    // 3. Path B: Human Path (Dice >= 50) -> Try to find match
    console.log("Path: Human (Searching for match...)");
    const foundGameId = await findMatch(arena.stake);

    if (foundGameId !== null) {
      console.log("Match Found! Joining Game ID:", foundGameId);
      setTargetGameId(foundGameId);
      joinGame(foundGameId, arena.stake);
    } else {
      console.log("No match found. Creating new game...");
      createGame(arena.stake);
    }
  };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground font-mono">
        <div className="border border-red-500/50 bg-red-500/10 p-8 rounded-lg max-w-md w-full">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-red-500">ACCESS DENIED</h1>
          <p className="text-gray-400 mb-6">Secure connection required. Please connect your wallet to access the arena.</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 font-mono relative overflow-hidden flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Header */}
      <Navbar />

      <div className="max-w-6xl mx-auto w-full z-10 flex-1 flex-col justify-center flex">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
             <div className="w-2 h-2 bg-primary rounded-sm" />
             <span className="text-xs font-bold tracking-widest">SECURE CONNECTION ESTABLISHED</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">SELECT YOUR ARENA</h1>
          <p className="text-gray-400 max-w-lg">Initiate the Turing Test. Stake your MNT to enter the simulation. Deceive to win.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {arenas.map((arena) => (
            <div 
              key={arena.id}
              onClick={() => setSelectedArena(arena.id)}
              className={`relative group rounded-lg border-2 bg-secondary/50 p-6 transition-all duration-300 cursor-pointer ${
                selectedArena === arena.id 
                  ? `${arena.color} bg-secondary shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.02]` 
                  : `border-muted bg-secondary/30 hover:bg-secondary/50 ${arena.hover}`
              }`}
            >
              {arena.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider shadow-lg">
                  Recommended
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                   arena.id === 'hightable' ? 'border-red-900 text-red-500 bg-red-900/10' :
                   arena.id === 'pit' ? 'border-primary text-primary bg-primary/10' :
                   'border-gray-600 text-gray-400 bg-gray-800/50'
                }`}>
                  {arena.label}
                </span>
                {arena.icon && <div className="text-gray-500">{arena.icon}</div>}
              </div>

              <h2 className="text-xl font-bold text-white mb-1">{arena.title}</h2>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-4xl font-bold ${
                   arena.id === 'hightable' ? 'text-red-500' :
                   arena.id === 'pit' ? 'text-primary' :
                   'text-white'
                }`}>{arena.stake}</span>
                <span className="text-xs text-gray-500">MNT / Entry</span>
              </div>

              <div className="space-y-3 mb-8">
                {arena.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                       arena.id === 'hightable' ? 'bg-red-900/20 text-red-500' :
                       arena.id === 'pit' ? 'bg-primary/20 text-primary' :
                       'bg-gray-800 text-gray-400'
                    }`}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <button className={`w-full py-3 rounded text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedArena === arena.id
                  ? 'bg-white text-black'
                  : 'bg-muted text-gray-400 group-hover:bg-muted/80'
              }`}>
                {selectedArena === arena.id ? 'SELECTED' : `SELECT LINK [${arena.id === 'playground' ? '1' : arena.id === 'pit' ? '2' : '3'}]`}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="border border-primary/20 bg-primary/5 rounded-lg p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <h3 className="text-2xl font-bold text-white mb-2 relative z-10">READY TO INITIALIZE?</h3>
          <p className="text-gray-400 mb-6 text-sm max-w-lg mx-auto relative z-10">
            Confirm your selection to stake funds and enter the simulation. 
            Once engaged, the protocol cannot be reversed.
          </p>
          
          <div className="flex flex-col items-center gap-4 relative z-10">
             <div className="w-full max-w-md flex justify-between text-xs font-mono text-gray-500 mb-2 border-b border-gray-800 pb-2">
               <span>SELECTED PROTOCOL</span>
               <span className="text-primary uppercase">{selectedArena ? arenas.find(a => a.id === selectedArena)?.title : 'NONE'} ({selectedArena ? arenas.find(a => a.id === selectedArena)?.stake : '0'} MNT)</span>
             </div>
             
             <button
               disabled={!selectedArena || isPending || isConfirming}
               onClick={handleInitialize}
               className={`w-full max-w-md py-4 rounded font-bold text-lg tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                 selectedArena && !isPending && !isConfirming
                   ? 'bg-primary text-black hover:bg-blue-400 shadow-primary/20' 
                   : 'bg-gray-800 text-gray-500 cursor-not-allowed'
               }`}
             >
               {isPending || isConfirming ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
               ) : (
                 <Zap className="w-5 h-5 fill-current" />
               )}
               {isPending ? 'CONFIRMING...' : isConfirming ? 'INITIALIZING...' : 'INITIALIZE LINK [ENTER ARENA]'}
             </button>
             
             <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2">Gas fees apply // Mantle Network</p>
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-12 border-t border-muted/30 pt-6 flex flex-col md:flex-row justify-between gap-4 text-[10px] text-gray-600 uppercase tracking-widest z-10 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <Terminal className="w-3 h-3" />
          0xHuman Protocol
        </div>
        <div className="flex justify-center gap-6">
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>Smart Contract</span>
        </div>
        <div>
           &copy; 2025 0xHuman. System Version 1.0.4
        </div>
      </div>
    </main>
  );
}
