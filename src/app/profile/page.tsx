'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { User, Zap, Trophy, Target, Users, Gift, Copy, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useAccount } from 'wagmi';

interface ExpData {
  totalExp: number;
  gamesPlayed: number;
  gamesWon: number;
  referralCount: number;
  lastUpdated: number;
}

interface MatchRecord {
  gameId: number;
  opponent: string;
  stake: number;
  won: boolean;
  expEarned: number;
  payout: number;
  playedAt: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [expData, setExpData] = useState<ExpData | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch EXP data and match history
  useEffect(() => {
    if (address) {
      setLoading(true);
      
      // Fetch EXP data
      fetch(`http://localhost:3001/api/exp/${address}`)
        .then(res => res.json())
        .then(data => {
          setExpData(data);
        })
        .catch(() => {
          setExpData({ totalExp: 0, gamesPlayed: 0, gamesWon: 0, referralCount: 0, lastUpdated: 0 });
        });
      
      // Fetch match history
      fetch(`http://localhost:3001/api/match-history/${address}`)
        .then(res => res.json())
        .then(data => {
          setMatchHistory(data.history || []);
          setLoading(false);
        })
        .catch(() => {
          setMatchHistory([]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [address]);

  // Generate referral link
  const referralLink = address ? `${typeof window !== 'undefined' ? window.location.origin : ''}/arena?ref=${address.slice(0, 8)}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const winRate = expData && expData.gamesPlayed > 0 
    ? ((expData.gamesWon / expData.gamesPlayed) * 100).toFixed(1) 
    : '0';

  return (
    <main className="min-h-screen bg-background font-mono relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <Navbar />
      
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        {/* Profile Header */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'NOT CONNECTED'}
              </h1>
              <p className="text-gray-500 text-sm">0xHuman Player</p>
            </div>
            {expData && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="w-6 h-6" />
                  <span className="text-3xl font-bold">{(expData.totalExp ?? 0).toLocaleString()}</span>
                </div>
                <p className="text-gray-500 text-sm">TOTAL 0xP</p>
              </div>
            )}
          </div>
        </div>

        {/* EXP Explainer */}
        <div className="bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-white font-semibold">Earn 0xP, Get Rewards!</p>
              <p className="text-gray-400 text-sm">Play games and refer friends to earn 0xP. Convert to tokens in future airdrop!</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <Target className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{expData?.gamesPlayed || 0}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Games Played</p>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{expData?.gamesWon || 0}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Games Won</p>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
              <span className="text-2xl">%</span>
            </div>
            <p className="text-2xl font-bold text-white">{winRate}%</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Win Rate</p>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{expData?.referralCount || 0}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Referrals</p>
          </div>
        </div>

        {/* EXP Breakdown */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">How to Earn 0xP</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏆</span>
                <span className="text-gray-300">Win a game</span>
              </div>
              <span className="text-primary font-bold">+100 0xP</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎮</span>
                <span className="text-gray-300">Participate in a game</span>
              </div>
              <span className="text-primary font-bold">+25 0xP</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎁</span>
                <span className="text-gray-300">First game bonus</span>
              </div>
              <span className="text-primary font-bold">+50 0xP</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔗</span>
                <span className="text-gray-300">Refer a friend</span>
              </div>
              <span className="text-primary font-bold">+200 0xP</span>
            </div>
          </div>
        </div>

        {/* Match History */}
        {isConnected && matchHistory.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Match History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                    <th className="py-3 px-2 text-left">Game</th>
                    <th className="py-3 px-2 text-left">Opponent</th>
                    <th className="py-3 px-2 text-center">Stake</th>
                    <th className="py-3 px-2 text-center">Result</th>
                    <th className="py-3 px-2 text-right">0xP</th>
                    <th className="py-3 px-2 text-right">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((match, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-2 text-gray-400">#{match.gameId}</td>
                      <td className="py-3 px-2 text-gray-300 font-mono text-xs">
                        {match.opponent?.slice(0, 6)}...{match.opponent?.slice(-4)}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300">{match.stake} MNT</td>
                      <td className="py-3 px-2 text-center">
                        {match.won ? (
                          <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                            <TrendingUp className="w-4 h-4" /> WIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                            <TrendingDown className="w-4 h-4" /> LOSS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-primary">+{match.expEarned}</td>
                      <td className={`py-3 px-2 text-right font-semibold ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                        {match.won ? `+${match.payout.toFixed(2)}` : `-${match.stake}`} MNT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Referral Section */}
        {isConnected && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Your Referral Link</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 text-sm"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">Share this link to earn +200 0xP per referral!</p>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Connect your wallet to view your profile</p>
          </div>
        )}
      </div>
    </main>
  );
}
