'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import { ArrowLeft, Bot, Coins, Trophy, TrendingDown, Plus, Flame, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses, DEFAULT_CHAIN_ID } from '@/lib/chain';
import BotINFTABI from '@/contracts/BotINFTABI.json';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

interface BotEntry {
    tokenId: bigint;
    personalityHash: string;
    personalityURI: string;
    memoryHash: string;
    memoryURI: string;
    vaultBalance: bigint;
    lastDepositBlock: bigint;
    wins: bigint;
    losses: bigint;
    slot: number;
    tier: number; // 0=Rookie, 1=Verified
}

interface PersonaMeta {
    slug: string;
    name: string;
    tagline?: string;
    color?: string;
    custom?: boolean;
}

export default function MyBotsPage() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const [bots, setBots] = useState<BotEntry[]>([]);
    const [hashMeta, setHashMeta] = useState<Record<string, PersonaMeta>>({});
    const [loading, setLoading] = useState(false);

    const botAddr = (() => {
        try { return getAddresses(chainId).BotINFT; } catch { return getAddresses(DEFAULT_CHAIN_ID).BotINFT; }
    })();

    const { data: nextTokenId } = useReadContract({
        address: botAddr,
        abi: BotINFTABI,
        functionName: 'nextTokenId',
    });

    useEffect(() => {
        async function loadBots() {
            if (!publicClient || !address || !nextTokenId) return;
            setLoading(true);
            const total = Number(nextTokenId) - 1;
            const found: BotEntry[] = [];
            for (let id = 1; id <= total; id++) {
                try {
                    const owner = (await publicClient.readContract({
                        address: botAddr,
                        abi: BotINFTABI,
                        functionName: 'ownerOf',
                        args: [BigInt(id)],
                    })) as string;
                    if (owner.toLowerCase() !== address.toLowerCase()) continue;
                    const data = (await publicClient.readContract({
                        address: botAddr,
                        abi: BotINFTABI,
                        functionName: 'bots',
                        args: [BigInt(id)],
                    })) as any;
                    found.push({
                        tokenId: BigInt(id),
                        personalityHash: data[0],
                        personalityURI: data[1],
                        memoryHash: data[2],
                        memoryURI: data[3],
                        vaultBalance: data[4],
                        lastDepositBlock: data[5],
                        wins: data[6],
                        losses: data[7],
                        slot: Number(data[8]),
                        tier: Number(data[9]),
                    });
                } catch {
                    // tokenId may not exist (burned) — skip
                }
            }
            setBots(found);

            // Resolve each bot's persona via backend hash lookup
            const updates: Record<string, PersonaMeta> = {};
            await Promise.all(found.map(async (b) => {
                const h = b.personalityHash.toLowerCase();
                if (hashMeta[h]) return;
                try {
                    const r = await fetch(`${WS_URL}/api/personas/by-hash?h=${h}`);
                    if (!r.ok) return;
                    const meta = await r.json();
                    updates[h] = meta;
                } catch {
                    // best-effort
                }
            }));
            if (Object.keys(updates).length > 0) {
                setHashMeta((prev) => ({ ...prev, ...updates }));
            }
            setLoading(false);
        }
        loadBots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, nextTokenId, publicClient, botAddr]);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto px-6 py-12">
                <Link href="/" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-2 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Home
                </Link>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                            <Bot className="w-9 h-9 text-primary" /> My Bots
                        </h1>
                        <p className="text-gray-400">Your AI bot personas + their per-bot vaults.</p>
                    </div>
                    <Link
                        href="/bots/create"
                        className="px-4 py-2 rounded bg-primary text-black font-bold text-sm inline-flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" /> Mint new
                    </Link>
                </div>

                {!isConnected ? (
                    <div className="rounded-lg border border-gray-800 bg-black/60 p-12 text-center">
                        <div className="text-gray-400 mb-4">Connect wallet to see your bots</div>
                        <div className="inline-block">
                            <ConnectButton />
                        </div>
                    </div>
                ) : loading ? (
                    <div className="rounded-lg border border-gray-800 bg-black/60 p-12 text-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading your bots…
                    </div>
                ) : bots.length === 0 ? (
                    <div className="rounded-lg border border-gray-800 bg-black/60 p-12 text-center">
                        <Bot className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <div className="text-gray-400 mb-2">No bots yet</div>
                        <div className="text-xs text-gray-600 mb-6">Your first slot is free.</div>
                        <Link href="/bots/create" className="px-5 py-2 rounded bg-primary text-black font-bold text-sm inline-flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Mint your first bot
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bots.map((b) => (
                            <BotCard key={String(b.tokenId)} bot={b} botAddr={botAddr} hashMeta={hashMeta} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function BotCard({ bot, botAddr, hashMeta }: { bot: BotEntry; botAddr: `0x${string}`; hashMeta: Record<string, PersonaMeta> }) {
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const [showActions, setShowActions] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Resolve persona by personalityHash via the backend hashmap
    const persona = hashMeta[bot.personalityHash.toLowerCase()];

    const totalMatches = bot.wins + bot.losses;
    const winRatePct = totalMatches > 0n ? Number((bot.wins * 10000n) / totalMatches) / 100 : 0;
    const tierLabel = bot.tier === 1 ? 'Verified' : 'Rookie';

    // Arena coverage — must match the requiredVault values in arena/page.tsx
    const ARENA_TIERS = [
        { id: 'sandbox', label: 'Arena 1', requiredVault: 10n * 10n ** 18n },
        { id: 'pit', label: 'Arena 2', requiredVault: 20n * 10n ** 18n },
        { id: 'hightable', label: 'Arena 3', requiredVault: 30n * 10n ** 18n },
    ];
    const firstLocked = ARENA_TIERS.find((t) => bot.vaultBalance < t.requiredVault);
    const shortage = firstLocked ? firstLocked.requiredVault - bot.vaultBalance : 0n;
    const shortageFormatted = shortage > 0n ? Number(formatEther(shortage)).toFixed(2) : '0';

    const quickFund = () => {
        if (!firstLocked) return;
        setDepositAmount(shortageFormatted);
        setShowActions(true);
    };

    const onDeposit = () => {
        if (!depositAmount) return;
        writeContract({
            address: botAddr,
            abi: BotINFTABI,
            functionName: 'depositToVault',
            args: [bot.tokenId],
            value: parseEther(depositAmount),
        });
    };
    const onWithdraw = () => {
        if (!withdrawAmount) return;
        writeContract({
            address: botAddr,
            abi: BotINFTABI,
            functionName: 'withdrawFromVault',
            args: [bot.tokenId, parseEther(withdrawAmount)],
        });
    };
    const onBurn = () => {
        if (!confirm(`Burn bot ${persona?.name ?? bot.tokenId}? You'll receive the full vault balance back. This cannot be undone.`)) return;
        writeContract({
            address: botAddr,
            abi: BotINFTABI,
            functionName: 'burnBot',
            args: [bot.tokenId],
        });
    };

    return (
        <div className="rounded-lg border border-gray-800 bg-black/60 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-800">
                <div className="flex items-start gap-4">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-black flex-shrink-0"
                        style={{ background: persona?.color ?? '#7C7C7C' }}
                    >
                        {persona?.name?.slice(0, 2) ?? `#${bot.tokenId}`}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-lg">{persona?.name ?? `Bot #${bot.tokenId}`}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bot.tier === 1 ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {tierLabel}
                            </span>
                            {persona?.custom && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">CUSTOM</span>
                            )}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">{persona?.tagline ?? '— persona not indexed —'}</div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span>Token #{String(bot.tokenId)} • Slot {bot.slot}</span>
                            <a
                                href={`https://chainscan-galileo.0g.ai/token/${botAddr}?a=${bot.tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary inline-flex items-center gap-1"
                            >
                                Explorer <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-px bg-gray-900">
                <div className="bg-black/60 p-4">
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> Vault
                    </div>
                    <div className="font-bold font-mono">{Number(formatEther(bot.vaultBalance)).toFixed(3)} 0G</div>
                </div>
                <div className="bg-black/60 p-4">
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> W / L
                    </div>
                    <div className="font-bold font-mono">{String(bot.wins)} / {String(bot.losses)}</div>
                </div>
                <div className="bg-black/60 p-4">
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Win rate
                    </div>
                    <div className="font-bold font-mono">{totalMatches === 0n ? '—' : `${winRatePct.toFixed(1)}%`}</div>
                </div>
            </div>

            {/* Arena coverage */}
            <div className="px-4 pt-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Arena Coverage</div>
                <div className="flex items-center gap-2 mb-2">
                    {ARENA_TIERS.map((t) => {
                        const covered = bot.vaultBalance >= t.requiredVault;
                        return (
                            <div
                                key={t.id}
                                className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold border ${
                                    covered
                                        ? 'border-green-700/50 bg-green-900/20 text-green-400'
                                        : 'border-gray-800 bg-black/40 text-gray-600'
                                }`}
                            >
                                {covered ? '✓' : '✗'} {t.label}
                            </div>
                        );
                    })}
                </div>
                {firstLocked ? (
                    <button
                        onClick={quickFund}
                        className="w-full text-[11px] text-yellow-500 hover:text-yellow-400 py-1 inline-flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-3 h-3" /> Top up {shortageFormatted} 0G to unlock {firstLocked.label}
                    </button>
                ) : (
                    <div className="text-center text-[11px] text-green-500 py-1">All arenas active ✨</div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4">
                {!showActions ? (
                    <button
                        onClick={() => setShowActions(true)}
                        className="w-full py-2 rounded border border-gray-700 hover:border-gray-500 text-sm"
                    >
                        Manage vault
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wider">Deposit (0G)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.0"
                                    step="0.1"
                                    className="flex-1 bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono"
                                />
                                <button
                                    onClick={onDeposit}
                                    disabled={isPending || isConfirming || !depositAmount}
                                    className="px-4 py-2 rounded bg-primary/80 text-black font-bold text-xs hover:bg-primary disabled:opacity-50"
                                >
                                    Deposit
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wider">Withdraw (0G)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.0"
                                    step="0.1"
                                    className="flex-1 bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono"
                                />
                                <button
                                    onClick={onWithdraw}
                                    disabled={isPending || isConfirming || !withdrawAmount}
                                    className="px-4 py-2 rounded bg-gray-700 text-white font-bold text-xs hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Withdraw
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={onBurn}
                            disabled={isPending || isConfirming}
                            className="w-full py-2 rounded border border-red-900/50 text-red-400 hover:bg-red-950/30 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Flame className="w-3 h-3" /> Burn (return vault, lose mint fee)
                        </button>
                        {hash && (
                            <a
                                href={`https://chainscan-galileo.0g.ai/tx/${hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                            >
                                Tx: {hash.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                        {isConfirmed && <div className="text-[10px] text-green-400">✓ Confirmed</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
