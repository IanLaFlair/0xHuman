'use client';

import React from 'react';

const phases = [
  {
    id: 1,
    title: 'Genesis (0G testnet)',
    status: 'current',
    emoji: '✅',
    tagline: 'The foundation. Verifiable AI as gameplay, end-to-end.',
    sections: [
      {
        title: 'Live on 0G Galileo Testnet',
        items: [
          '60-second blind chat → vote → on-chain settle',
          'PvE mode (Human vs INFT bot) and PvP mode (Human vs Human)',
          'Per-bot vault model — each bot is its own bankroll'
        ]
      },
      {
        title: 'Full 0G Stack Wired',
        items: [
          '0G Compute (Qwen 2.5 7B Instruct, TEE-attested)',
          '0G Storage (encrypted bot prompts + memory + chat transcripts)',
          '0G Chain (game escrow + INFT registry)',
          'ERC-7857 Agent ID (tradable bot ownership)'
        ]
      },
      {
        title: 'Bot Economy',
        items: [
          'Free first slot + paid slot 2/3 (10/25 0G)',
          'Owner deposits vault → bot matches player stakes 1:1',
          'Owner earns when bot wins, loses when bot loses'
        ]
      },
      {
        title: '0xP System',
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
    title: 'Mainnet + Memory',
    status: 'upcoming',
    emoji: '🧠',
    tagline: 'Bots that get smarter over time, on real money.',
    sections: [
      {
        title: '0G Mainnet Deployment',
        items: [
          'Contracts re-deployed on 0G mainnet (chain 16661)',
          'Real-money stakes with production-tier economics',
          'Smart contract audit pass before launch'
        ]
      },
      {
        title: 'Persistent Memory (when 0G ships it)',
        items: [
          'Replace RAG-injected memory block with native 0G Persistent Memory',
          'Cross-session bot context without re-uploading the entire blob',
          'Larger lesson buffers, longer opponent histories'
        ]
      },
      {
        title: 'Lesson Curation',
        items: [
          'Owner-side UI to approve/reject auto-extracted lessons',
          'Manual lesson injection from creator notes',
          'Lesson voting and sharing across bots an owner controls'
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'Bot Marketplace',
    status: 'upcoming',
    emoji: '🤖',
    tagline: 'Trade, rent, and stake on AI bots like assets.',
    sections: [
      {
        title: 'ERC-7857 Secondary Market',
        items: [
          'List bots for sale with re-encrypted metadata transfer',
          'Floor + bid book per persona',
          'Royalties to original creator on every resale'
        ]
      },
      {
        title: 'Bot Rental (authorizeUsage)',
        items: [
          'Rent out top bots without transferring ownership',
          'Time-bounded usage grants',
          'Automatic revenue split between owner and renter'
        ]
      },
      {
        title: 'Bot LPing',
        items: [
          'Stake your 0G into someone else\'s bot vault',
          'Share P/L based on stake share',
          'Curate top performers, reduce single-creator concentration'
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Fine-Tuning + Alignment',
    status: 'upcoming',
    emoji: '⚡',
    tagline: 'Truly evolving agents, watched by alignment nodes.',
    sections: [
      {
        title: '0G Compute Fine-Tuning',
        items: [
          'Fine-tune your bot on its own match history',
          'Snapshot → Train → Promote — same INFT, smarter weights',
          'Side-by-side compare original vs fine-tuned variant'
        ]
      },
      {
        title: 'AI Alignment Nodes',
        items: [
          'Real-time drift / bias / anomaly detection on bot replies',
          'Quarantine misbehaving bots before they hit prod matchmaking',
          'Public dashboard of alignment scores per persona'
        ]
      },
      {
        title: '0xP Airdrop',
        items: [
          'Snapshot accumulated 0xP at a specific block',
          'Top players + active referrers receive bonus allocation',
          'Token claim with optional staking'
        ]
      }
    ]
  }
];

export default function RoadmapTimeline() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">ROADMAP</h1>
      <p className="text-gray-400 mb-8">
        The evolution of 0xHuman. From the live 0G testnet build to fine-tuned, alignment-monitored AI agents.
      </p>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-blue-500/50 to-gray-800" />

        {/* Phases */}
        {phases.map((phase) => (
          <div key={phase.id} className="relative pl-10 pb-8 last:pb-0">
            {/* Dot on the line */}
            <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 ${
              phase.status === 'current'
                ? 'bg-primary border-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                : 'bg-gray-900 border-gray-600'
            }`} />

            {/* Phase Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{phase.emoji}</span>
              <h2 className="text-xl font-bold text-white">
                Phase {phase.id}: {phase.title}
              </h2>
              {phase.status === 'current' && (
                <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded font-bold">
                  LIVE
                </span>
              )}
            </div>

            {/* Tagline */}
            <p className="text-gray-400 text-sm italic mb-4 ml-7">
              {phase.tagline}
            </p>

            {/* Sections */}
            <div className="space-y-4 ml-7">
              {phase.sections.map((section, sIndex) => (
                <div key={sIndex}>
                  <h3 className="text-accent-green text-sm font-bold mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item, iIndex) => (
                      <li key={iIndex} className="flex items-start gap-2 text-gray-300 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Beyond */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <h2 className="text-lg font-bold text-white mb-2">Beyond Phase 4...</h2>
        <p className="text-gray-400 text-sm">
          Cross-language bot personas, tournament mode with leaderboards per persona,
          DAO governance for protocol parameters, and mobile-native app.
        </p>
      </div>
    </div>
  );
}
