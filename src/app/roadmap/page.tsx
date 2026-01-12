'use client';

import React from 'react';
import Navbar from '@/components/Navbar';

const phases = [
  {
    id: 1,
    title: 'Genesis',
    status: 'current',
    emoji: '✅',
    tagline: 'The foundation. Prove the concept works.',
    sections: [
      {
        title: 'MVP on Mantle Sepolia Testnet',
        items: [
          'Core gameplay loop (60-second chat, voting, resolution)',
          'PvE mode (Human vs AI) and PvP mode (Human vs Human)',
          'On-chain betting with smart contract escrow'
        ]
      },
      {
        title: 'Basic Economy',
        items: [
          'MNT staking with 190% payout on wins',
          '5% protocol fee on winning pots',
          'Three betting tiers (2 / 10 / 30 MNT)'
        ]
      },
      {
        title: '0xP System Launch',
        items: [
          'Experience points for every game played',
          'Leaderboard rankings',
          'Referral rewards (+200 0xP)'
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'House Pool',
    status: 'upcoming',
    emoji: '🔄',
    tagline: 'Decentralize the house. Let anyone be the casino.',
    sections: [
      {
        title: 'Liquidity Provider (LP) System',
        items: [
          'Deposit MNT to become a House stakeholder',
          'Receive 0xLP tokens representing pool share',
          'Earn yield from house edge on losing player bets'
        ]
      },
      {
        title: 'Pool Governance',
        items: [
          'Dynamic max bet limits (10% of pool)',
          'Automatic arena availability based on liquidity',
          'Reserve protection (minimum 10 MNT locked)'
        ]
      },
      {
        title: 'Mainnet Preparation',
        items: [
          'Smart contract audits',
          'Security testing and hardening',
          'Mantle Mainnet deployment'
        ]
      }
    ]
  },
  {
    id: 3,
    title: '0xP Airdrop',
    status: 'upcoming',
    emoji: '📸',
    tagline: 'Reward the early believers.',
    sections: [
      {
        title: 'Snapshot Event',
        items: [
          'All accumulated 0xP captured at a specific block',
          'Top players on leaderboard receive bonus allocation',
          'Referral multipliers for active promoters'
        ]
      },
      {
        title: 'Token Distribution',
        items: [
          '0xP converts to governance/utility token',
          'Claimable airdrop for eligible wallets',
          'Staking opportunities for long-term holders'
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'The Marketplace',
    status: 'upcoming',
    emoji: '🤖',
    tagline: 'Build your own deceptive agent.',
    sections: [
      {
        title: 'Prompt-to-Earn',
        items: [
          'Create custom AI bots with unique personalities',
          'Train them to deceive human players',
          'Deploy bots to the arena for passive income'
        ]
      },
      {
        title: 'Bot NFTs',
        items: [
          'Each bot is a unique on-chain asset',
          'Trade successful bots on marketplace',
          'Rent out high-performing bots'
        ]
      },
      {
        title: 'Revenue Sharing',
        items: [
          'When your bot tricks a human → you earn a % of winnings',
          'Leaderboard for most deceptive bots',
          'Seasonal competitions with prizes'
        ]
      }
    ]
  }
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8 font-mono">
      <Navbar />
      
      <div className="max-w-4xl mx-auto mt-8">
        <h1 className="text-4xl font-bold text-primary mb-2">ROADMAP</h1>
        <p className="text-gray-400 mb-12">
          The evolution of 0xHuman. From testnet experiments to a full-fledged social deduction ecosystem.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-blue-500 to-gray-800" />

          {/* Phases */}
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative pl-12 pb-12 last:pb-0">
              {/* Dot on the line */}
              <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                phase.status === 'current' 
                  ? 'bg-primary border-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                  : 'bg-gray-900 border-gray-600'
              }`} />

              {/* Phase Card */}
              <div className={`border rounded-lg p-6 ${
                phase.status === 'current'
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-gray-800 bg-gray-900/30'
              }`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{phase.emoji}</span>
                  <h2 className="text-xl font-bold text-white">
                    Phase {phase.id}: {phase.title}
                  </h2>
                  {phase.status === 'current' && (
                    <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded font-bold">
                      CURRENT
                    </span>
                  )}
                </div>

                {/* Tagline */}
                <p className="text-gray-400 text-sm italic mb-6 pl-9">
                  {phase.tagline}
                </p>

                {/* Sections */}
                <div className="space-y-4 pl-9">
                  {phase.sections.map((section, sIndex) => (
                    <div key={sIndex}>
                      <h3 className="text-accent-green text-sm font-bold mb-2">
                        {section.title}
                      </h3>
                      <ul className="space-y-1">
                        {section.items.map((item, iIndex) => (
                          <li key={iIndex} className="flex items-start gap-2 text-gray-300 text-sm">
                            <span className="text-primary mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Beyond */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <h2 className="text-xl font-bold text-white mb-4">Beyond Phase 4...</h2>
          <p className="text-gray-400">
            Future possibilities include cross-chain expansion, tournament modes with prize pools, 
            DAO governance for protocol parameters, and partnership integrations with other AI/Web3 projects.
          </p>
        </div>
      </div>
    </main>
  );
}
