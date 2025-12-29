'use client';

import { useState } from 'react';
import { Lock, TrendingUp, ArrowUpCircle, ArrowDownCircle, Percent, Activity, Clock, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Mock data - will be replaced with contract data
const MOCK_POOL_DATA = {
  tvl: 1234,
  userDeposit: 50,
  userShare: 4.05,
  unrealizedPnl: 2.5,
  winRate: 52,
  apy: 18,
  maxBet: 154.2,
};

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'deposit', amount: 25, timestamp: '2 hours ago', txHash: '0x1234...5678' },
  { id: 2, type: 'withdraw', amount: 10, timestamp: '1 day ago', txHash: '0xabcd...efgh' },
  { id: 3, type: 'deposit', amount: 35, timestamp: '3 days ago', txHash: '0x9876...5432' },
];

export default function HousePoolPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isConnected] = useState(true); // Mock - will use useAccount()

  const handleMaxClick = () => {
    if (activeTab === 'deposit') {
      setAmount('100'); // Max wallet balance
    } else {
      setAmount(MOCK_POOL_DATA.userDeposit.toString());
    }
  };

  const handleAction = () => {
    console.log(`${activeTab}: ${amount} MNT`);
    // Will call contract functions
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background text-white p-6 md:p-8 font-mono">
        <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">HOUSE POOL</h1>
              <p className="text-gray-400 text-sm">Provide liquidity to the house AI agents and earn yield.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TVL Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary text-xs font-semibold tracking-wider mb-2">TOTAL VALUE LOCKED</p>
                <p className="text-4xl font-bold">
                  {MOCK_POOL_DATA.tvl.toLocaleString()} <span className="text-lg text-gray-400">MNT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-gray-500" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
            </div>
          </div>

          {/* Your Deposit Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary text-xs font-semibold tracking-wider mb-2">YOUR DEPOSIT</p>
                <p className="text-4xl font-bold">
                  {MOCK_POOL_DATA.userDeposit} <span className="text-lg text-gray-400">MNT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-500" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${MOCK_POOL_DATA.userShare}%` }} />
            </div>
          </div>
        </div>

        {/* Share & PnL Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Your Share */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Percent className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300">Your Share</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">{MOCK_POOL_DATA.userShare}%</span>
              {/* Progress bar */}
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(MOCK_POOL_DATA.userShare * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Unrealized PnL */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300">Unrealized PnL</span>
            </div>
            <span className={`text-2xl font-bold ${MOCK_POOL_DATA.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {MOCK_POOL_DATA.unrealizedPnl >= 0 ? '+' : ''}{MOCK_POOL_DATA.unrealizedPnl} MNT
            </span>
          </div>
        </div>

        {/* Manage Liquidity */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-400 tracking-wider">MANAGE LIQUIDITY</h2>
            <span className="text-sm text-primary">Max: {MOCK_POOL_DATA.maxBet} MNT</span>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                ${activeTab === 'deposit' 
                  ? 'bg-primary text-black' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              DEPOSIT
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                ${activeTab === 'withdraw' 
                  ? 'bg-primary text-black' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              WITHDRAW
            </button>
          </div>

          {/* Amount Input */}
          <div className="relative mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 pr-28 text-2xl font-bold 
                focus:outline-none focus:border-primary transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10">
              <span className="text-gray-400">MNT</span>
              <button 
                onClick={handleMaxClick}
                className="text-primary text-sm font-semibold hover:underline cursor-pointer bg-gray-800 px-2 py-1 rounded"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAction}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all
              ${amount && parseFloat(amount) > 0
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            {activeTab === 'deposit' ? 'DEPOSIT' : 'WITHDRAW'} {amount || '0'} MNT
          </button>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-xs tracking-wider mb-2">WIN RATE</p>
            <p className="text-3xl font-bold">{MOCK_POOL_DATA.winRate}%</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-xs tracking-wider mb-2">APY</p>
            <p className="text-3xl font-bold text-green-500">~{MOCK_POOL_DATA.apy}%</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 tracking-wider mb-4">RECENT TRANSACTIONS</h2>
          
          <div className="space-y-3">
            {MOCK_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  {tx.type === 'deposit' ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-semibold capitalize">{tx.type}</p>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.timestamp}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount} MNT
                  </p>
                  <a 
                    href={`https://sepolia.mantlescan.xyz/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 justify-end"
                  >
                    {tx.txHash}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {MOCK_TRANSACTIONS.length === 0 && (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          )}
        </div>

        </div>
      </div>
    </>
  );
}
