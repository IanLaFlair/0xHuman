'use client';

import { useState, useEffect } from 'react';
import { Lock, TrendingUp, ArrowUpCircle, ArrowDownCircle, Percent, Activity, Clock, ExternalLink, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAccount, useBalance } from 'wagmi';
import { usePoolStats, useUserPosition, useDeposit, useWithdraw } from '@/hooks/useHouseVault';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function HousePoolPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  
  // Wallet connection
  const { address, isConnected } = useAccount();
  const { data: walletBalance, refetch: refetchWallet } = useBalance({ address });
  
  // Contract hooks
  const { tvl, maxBet, refetch: refetchPool } = usePoolStats();
  const { balance: userBalance, sharePercent, refetch: refetchPosition } = useUserPosition();
  const { deposit, isPending: isDepositing, isConfirming: isConfirmingDeposit, isConfirmed: depositConfirmed, isError: depositError, error: depositErrorMsg } = useDeposit();
  const { withdrawAll, isPending: isWithdrawing, isConfirming: isConfirmingWithdraw, isConfirmed: withdrawConfirmed, isError: withdrawError, error: withdrawErrorMsg } = useWithdraw();

  // No max deposit limit anymore - wallet balance is the only limit
  
  // Calculate unrealized PnL (simplified - deposited vs current value)
  const depositedAmount = parseFloat(userBalance) || 0;
  const unrealizedPnl = 0; // Would need deposit history to calculate properly

  // Error state
  const hasError = depositError || withdrawError;
  const errorMessage = depositErrorMsg?.message || withdrawErrorMsg?.message || '';

  // Auto-refresh data after successful tx
  useEffect(() => {
    if (depositConfirmed || withdrawConfirmed) {
      setAmount('');
      // Refetch all data after tx confirmed
      setTimeout(() => {
        refetchPool();
        refetchPosition();
        refetchWallet();
      }, 1000); // Wait 1 second for blockchain to update
    }
  }, [depositConfirmed, withdrawConfirmed, refetchPool, refetchPosition, refetchWallet]);

  const handleMaxClick = () => {
    if (activeTab === 'deposit') {
      setAmount(walletBalance?.formatted || '0');
    } else {
      setAmount(userBalance);
    }
  };

  const handleAction = () => {
    if (activeTab === 'deposit' && amount) {
      deposit(amount);
    } else if (activeTab === 'withdraw') {
      withdrawAll();
    }
  };

  const isPending = isDepositing || isWithdrawing;
  const isConfirming = isConfirmingDeposit || isConfirmingWithdraw;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background text-white p-6 md:p-8 font-mono relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mx-auto mb-6">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3">HOUSE POOL</h2>
            <p className="text-xl text-primary font-semibold mb-4">Coming in Next Update</p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Become the house and earn yield from AI agents. Deposit MNT to back the bots — 
              when they win, you profit. When they lose, you share the loss.
            </p>
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-4 text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Features</p>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Deposit & Withdraw MNT</li>
                <li>• Earn yield from bot wins</li>
                <li>• Track your pool share</li>
                <li>• Real-time PnL tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Blurred Content Behind */}
        <div className="max-w-4xl mx-auto space-y-8 blur-sm opacity-50 pointer-events-none">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">HOUSE POOL</h1>
              <p className="text-gray-400 text-sm">Become the house and earn yield from AI agents.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Explainer Section */}
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 rounded-xl p-6">
          <h2 className="text-lg font-bold text-primary mb-4">🏦 BE THE HOUSE, NOT THE PLAYER</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-2xl mb-2">💰</div>
              <p className="text-gray-300"><span className="text-white font-semibold">Deposit MNT</span> → You become "The House"</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-gray-300"><span className="text-green-400 font-semibold">Bot WINS</span> vs player → You profit!</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-2xl mb-2">❌</div>
              <p className="text-gray-300"><span className="text-red-400 font-semibold">Bot LOSES</span> vs player → You share the loss</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4 text-center">
            Bigger pool → Higher max bet → More games → More yield! 🚀
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TVL Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary text-xs font-semibold tracking-wider mb-2">TOTAL VALUE LOCKED</p>
                <p className="text-4xl font-bold">
                  {parseFloat(tvl).toLocaleString()} <span className="text-lg text-gray-400">MNT</span>
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
                  {parseFloat(userBalance).toFixed(2)} <span className="text-lg text-gray-400">MNT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-500" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${parseFloat(sharePercent)}%` }} />
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
              <span className="text-2xl font-bold text-primary">{parseFloat(sharePercent).toFixed(2)}%</span>
              {/* Progress bar */}
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(parseFloat(sharePercent) * 10, 100)}%` }}
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
            <span className={`text-2xl font-bold ${unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)} MNT
            </span>
          </div>
        </div>

        {/* Manage Liquidity */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-400 tracking-wider">MANAGE LIQUIDITY</h2>
            <span className="text-sm text-primary">Max Bet: {parseFloat(maxBet).toFixed(2)} MNT</span>
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
            disabled={!isConnected || (activeTab === 'deposit' && (!amount || parseFloat(amount) <= 0)) || isPending || isConfirming}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2
              ${isConnected && ((activeTab === 'deposit' && amount && parseFloat(amount) > 0) || activeTab === 'withdraw') && !isPending && !isConfirming
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            {(isPending || isConfirming) && <Loader2 className="w-5 h-5 animate-spin" />}
            {isPending ? 'CONFIRMING...' : isConfirming ? 'PROCESSING...' : activeTab === 'deposit' ? `DEPOSIT ${amount || '0'} MNT` : 'WITHDRAW ALL'}
          </button>

          {/* Info Messages */}
          {activeTab === 'deposit' && (
            <p className="text-gray-500 text-xs mt-2 text-center">
              Min deposit: 1 MNT • No max limit
            </p>
          )}
          {hasError && (
            <p className="text-red-500 text-sm mt-2 text-center">
              ❌ Transaction failed. Check wallet or try again.
            </p>
          )}
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-xs tracking-wider mb-2">WIN RATE</p>
            <p className="text-3xl font-bold">~52%</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-xs tracking-wider mb-2">APY</p>
            <p className="text-3xl font-bold text-green-500">~18%</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 tracking-wider mb-4">RECENT TRANSACTIONS</h2>
          
          <p className="text-center text-gray-500 py-8">Transaction history coming soon</p>
        </div>

        </div>
      </div>
    </>
  );
}
