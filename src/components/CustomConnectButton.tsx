'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { User, LogOut, ChevronDown, Wallet } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mantleSepoliaTestnet, mantle } from 'wagmi/chains';

export default function CustomConnectButton() {
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const [isOpen, setIsOpen] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (networkRef.current && !networkRef.current.contains(event.target as Node)) {
        setIsNetworkOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, networkRef]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-primary/10 border border-primary text-primary font-bold px-4 py-2 rounded hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-4">
                  {/* Custom Network Switcher */}
                  <div className="relative hidden md:block" ref={networkRef}>
                    <button
                      onClick={() => setIsNetworkOpen(!isNetworkOpen)}
                      className="flex items-center gap-2 h-10 bg-secondary/30 border border-muted text-gray-400 px-3 rounded hover:text-white hover:border-gray-500 transition-colors text-xs font-bold tracking-wider"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 16, height: 16 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    
                    {/* Network Dropdown */}
                    {isNetworkOpen && (
                      <div className="absolute left-0 mt-2 w-64 bg-black/95 backdrop-blur-md border border-gray-800 rounded-lg shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-800">
                          <p className="text-xs font-bold text-white">Switch Networks</p>
                        </div>
                        
                        {/* Mantle Mainnet - Coming Soon */}
                        <div className="flex items-center justify-between px-4 py-3 opacity-50 cursor-not-allowed">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden">
                              <img src="https://assets.coingecko.com/coins/images/30980/small/token-logo.png" alt="Mantle" className="w-5 h-5" />
                            </div>
                            <span className="text-sm text-gray-400">Mantle</span>
                          </div>
                          <span className="text-[10px] text-yellow-500 font-bold px-2 py-0.5 bg-yellow-500/10 rounded">COMING SOON</span>
                        </div>
                        
                        {/* Mantle Sepolia Testnet - Active */}
                        <button
                          onClick={() => {
                            if (chainId !== mantleSepoliaTestnet.id) {
                              switchChain({ chainId: mantleSepoliaTestnet.id });
                            }
                            setIsNetworkOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${chainId === mantleSepoliaTestnet.id ? 'bg-primary/10' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden">
                              <img src="https://assets.coingecko.com/coins/images/30980/small/token-logo.png" alt="Mantle Sepolia" className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-white">Mantle Sepolia</span>
                              <span className="text-[10px] text-gray-500">(Testnet)</span>
                            </div>
                          </div>
                          {chainId === mantleSepoliaTestnet.id && (
                            <span className="text-[10px] text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded flex items-center gap-1">
                              Connected <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="hidden md:flex items-center gap-3 h-10 px-4 rounded border border-primary/30 bg-primary/5 text-white font-mono text-sm font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                     <div className="bg-primary p-0.5 rounded-[2px]">
                       <Wallet className="w-3 h-3 text-black" />
                     </div>
                     {account.displayBalance ? account.displayBalance : '0 MNT'}
                  </div>

                  {/* Account Dropdown */}
                  <div className="relative hidden md:block" ref={dropdownRef}>
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className="relative w-10 h-10 rounded border border-muted bg-secondary/50 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden group"
                    >
                      <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center group-hover:from-gray-700 group-hover:to-gray-900 transition-colors">
                         <User className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                      
                      {/* Green Status Dot */}
                      <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse"></div>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-gray-800 rounded shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-800">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Connected As</p>
                          <p className="text-sm font-bold text-white truncate">{account.displayName}</p>
                        </div>
                        <Link 
                          href="/profile" 
                          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <button
                          onClick={() => {
                            disconnect();
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
