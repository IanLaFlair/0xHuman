'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, Search, User, ArrowUpRight, ArrowRight } from 'lucide-react';

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const leaderboardData = [
    { rank: 1, identity: '0xDe...f4a', level: 'Level 42 Humanoid', wins: 420, winRate: 89, earned: '15,000.00' },
    { rank: 2, identity: 'Al_Hunter.eth', level: 'Verified Hunter', wins: 390, winRate: 85, earned: '12,400.00' },
    { rank: 3, identity: '0xAg...b21', level: 'New Recruit', wins: 315, winRate: 82, earned: '9,200.00' },
    { rank: 4, identity: 'Cipher_Punk', level: '', wins: 290, winRate: 78, earned: '8,150.00' },
    { rank: 5, identity: 'Neon_Ghost', level: '', wins: 210, winRate: 75, earned: '6,000.00' },
    { rank: 6, identity: 'Glitch_Mod', level: '', wins: 195, winRate: 72, earned: '5,450.00' },
  ];

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background font-mono relative overflow-hidden flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <Navbar />

      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-8 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-8 bg-primary" />
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                LEADERBOARD <span className="text-primary text-2xl md:text-3xl font-normal">//TOP_HUMANS</span>
              </h1>
            </div>
            <p className="text-gray-400 max-w-lg text-sm">
              Global rankings for Turing Test success rate. Prove your humanity to climb the chain.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-secondary/30 border border-muted p-4 rounded min-w-[140px]">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Staked</div>
              <div className="text-xl font-bold text-white">1,024,500 MNT</div>
            </div>
            <div className="bg-secondary/30 border border-muted p-4 rounded min-w-[140px]">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Active Humans</div>
              <div className="text-xl font-bold text-primary">8,492</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex bg-secondary/30 border border-muted rounded p-1">
            <button className="px-4 py-1.5 bg-primary text-black text-xs font-bold rounded-sm">
              [ ALL_TIME ]
            </button>
            <button className="px-4 py-1.5 text-gray-400 text-xs font-bold hover:text-white transition-colors">
              [ MONTHLY ]
            </button>
            <button className="px-4 py-1.5 text-gray-400 text-xs font-bold hover:text-white transition-colors">
              [ WEEKLY ]
            </button>
          </div>

          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input 
              type="text" 
              placeholder="> Search user_id or wallet..." 
              className="w-full md:w-80 bg-secondary/30 border border-muted rounded py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-primary animate-pulse" />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="border border-muted rounded-lg overflow-hidden bg-secondary/20 backdrop-blur-sm mb-8">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-muted text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5 md:col-span-4">Human Identity</div>
            <div className="col-span-2 text-right hidden md:block">Total Wins</div>
            <div className="col-span-3 md:col-span-2 text-center">Win Rate</div>
            <div className="col-span-3 text-right text-primary">MNT Earned</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-muted/30">
            {leaderboardData.map((user) => (
              <div key={user.rank} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                <div className="col-span-1 font-bold text-lg flex items-center gap-2">
                  {user.rank <= 3 && <Trophy className={`w-4 h-4 ${
                    user.rank === 1 ? 'text-yellow-500' : 
                    user.rank === 2 ? 'text-gray-400' : 'text-amber-700'
                  }`} />}
                  <span className={user.rank <= 3 ? 'text-white' : 'text-gray-500'}>
                    {user.rank.toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    user.rank === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white group-hover:text-primary transition-colors">{user.identity}</div>
                    {user.level && <div className="text-[10px] text-gray-500">{user.level}</div>}
                  </div>
                </div>

                <div className="col-span-2 text-right text-gray-300 font-medium hidden md:block">
                  {user.wins}
                </div>

                <div className="col-span-3 md:col-span-2 flex justify-center">
                  <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                    user.winRate >= 80 ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 
                    user.winRate >= 70 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {user.winRate}%
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>

                <div className="col-span-3 text-right font-bold text-primary flex items-center justify-end gap-2">
                  {user.earned}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-12">
          <button className="text-xs text-gray-500 hover:text-white transition-colors tracking-widest">
            [ LOAD_MORE_DATA ]
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary/30 bg-black/50 backdrop-blur-md p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded border border-primary/50 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] text-primary uppercase tracking-wider font-bold">Current User Detected</div>
              <div className="text-white font-bold">0xWallet...882</div>
            </div>
          </div>

          <div className="flex gap-8 text-center">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">My Rank</div>
              <div className="text-white font-bold">#452</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</div>
              <div className="text-white font-bold">54%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Earned</div>
              <div className="text-primary font-bold">50.00 MNT</div>
            </div>
          </div>

          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded border border-gray-700 transition-colors uppercase">
            View_Profile
          </button>
        </div>
      </div>
    </main>
  );
}
