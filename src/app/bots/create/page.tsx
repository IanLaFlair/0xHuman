'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useRouter } from 'next/navigation';
import { Loader2, Bot, Coins, Lock, Sparkles, ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses, DEFAULT_CHAIN_ID } from '@/lib/chain';
import BotINFTABI from '@/contracts/BotINFTABI.json';

interface Persona {
    slug: string;
    name: string;
    tagline?: string;
    color?: string;
    avatar?: string;
}

type SlotChoice = 1 | 2 | 3;

const SLOT_CONFIG: Record<SlotChoice, { fee: string; vault: string; total: string; tier: 'Rookie' | 'Verified'; label: string }> = {
    1: { fee: '0', vault: '2', total: '2', tier: 'Rookie', label: 'Free Slot' },
    2: { fee: '10', vault: '5', total: '15', tier: 'Verified', label: 'Paid Slot 2' },
    3: { fee: '25', vault: '10', total: '35', tier: 'Verified', label: 'Paid Slot 3' },
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export default function CreateBotPage() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const router = useRouter();

    const [mode, setMode] = useState<'template' | 'custom'>('template');
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [slot, setSlot] = useState<SlotChoice>(1);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ uri: string; hash: string; rootHash: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Custom-mode state
    const [customName, setCustomName] = useState('');
    const [customTagline, setCustomTagline] = useState('');
    const [customColor, setCustomColor] = useState('#7C7AED');
    const [customPrompt, setCustomPrompt] = useState('');

    const botAddr = (() => {
        try { return getAddresses(chainId).BotINFT; } catch { return getAddresses(DEFAULT_CHAIN_ID).BotINFT; }
    })();

    const { data: slotsOwned } = useReadContract({
        address: botAddr,
        abi: BotINFTABI,
        functionName: 'slotsOwned',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        fetch(`${WS_URL}/api/personas/list`)
            .then((r) => r.json())
            .then((d) => setPersonas(d.personas ?? []))
            .catch((e) => setError(`Failed to load personas: ${e.message}`));
    }, []);

    // Auto-pick the right slot based on what user already owns
    useEffect(() => {
        if (slotsOwned !== undefined) {
            const owned = Number(slotsOwned);
            const next = (owned + 1) as SlotChoice;
            if (next >= 1 && next <= 3) setSlot(next);
        }
    }, [slotsOwned]);

    async function handleMint() {
        if (!isConnected || !address) {
            setError('Connect your wallet');
            return;
        }
        if (mode === 'template' && !selected) {
            setError('Pick a persona first');
            return;
        }
        if (mode === 'custom') {
            if (!customName.trim()) { setError('Custom bot needs a name'); return; }
            if (customPrompt.trim().length < 50) { setError('Custom prompt should be at least 50 chars'); return; }
            if (customPrompt.length > 4000) { setError('Custom prompt is too long (4000 char max)'); return; }
        }
        setError(null);
        setUploading(true);

        try {
            const endpoint = mode === 'custom' ? '/api/personas/upload-custom' : '/api/personas/upload';
            const body = mode === 'custom'
                ? {
                      name: customName.trim(),
                      tagline: customTagline.trim() || undefined,
                      color: customColor,
                      systemPrompt: customPrompt.trim(),
                  }
                : { slug: selected };
            const resp = await fetch(`${WS_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.error || `Upload HTTP ${resp.status}`);
            }
            const data = await resp.json();
            setUploadResult({ uri: data.uri, hash: data.hash, rootHash: data.rootHash });

            const cfg = SLOT_CONFIG[slot];
            const totalValue = parseEther(cfg.total);

            if (slot === 1) {
                writeContract({
                    address: botAddr,
                    abi: BotINFTABI,
                    functionName: 'mintFreeSlot',
                    args: [data.uri, data.hash],
                    value: totalValue,
                });
            } else {
                writeContract({
                    address: botAddr,
                    abi: BotINFTABI,
                    functionName: 'mintPaidSlot',
                    args: [slot, data.uri, data.hash],
                    value: totalValue,
                });
            }
        } catch (e: any) {
            setError(e.message ?? 'Mint flow failed');
        } finally {
            setUploading(false);
        }
    }

    const cfg = SLOT_CONFIG[slot];
    const ownedCount = Number(slotsOwned ?? 0);
    const atCap = ownedCount >= 3;

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Link href="/" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-2 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Home
                </Link>

                <div className="mb-10">
                    <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                        <Bot className="w-9 h-9 text-primary" />
                        Mint your AI bot
                    </h1>
                    <p className="text-gray-400 max-w-2xl">
                        Pick a persona. Lock initial vault. Your bot enters the matchmaking pool.
                        When humans lose to it, you earn passive income. When humans beat it, your
                        vault takes the hit.
                    </p>
                </div>

                {/* Mode toggle */}
                <div className="mb-6 inline-flex rounded-lg border border-gray-800 bg-black/40 overflow-hidden">
                    <button
                        onClick={() => setMode('template')}
                        className={`px-5 py-2 text-sm font-bold tracking-wider uppercase transition ${mode === 'template' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Template
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`px-5 py-2 text-sm font-bold tracking-wider uppercase transition ${mode === 'custom' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Custom
                    </button>
                </div>

                {/* Template / Custom panel */}
                {mode === 'template' ? (
                    <div className="mb-10">
                        <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4">1. Choose persona</h2>
                        {personas.length === 0 ? (
                            <div className="text-gray-500">Loading personas…</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {personas.map((p) => (
                                    <button
                                        key={p.slug}
                                        onClick={() => setSelected(p.slug)}
                                        className={`group relative rounded-lg border-2 p-4 text-left transition-all ${
                                            selected === p.slug
                                                ? 'border-primary bg-primary/10'
                                                : 'border-gray-800 hover:border-gray-600 bg-black/40'
                                        }`}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-full mb-3 flex items-center justify-center font-bold text-black"
                                            style={{ background: p.color ?? '#7C7C7C' }}
                                        >
                                            {p.name.slice(0, 2)}
                                        </div>
                                        <div className="font-bold mb-1">{p.name}</div>
                                        <div className="text-xs text-gray-400">{p.tagline}</div>
                                        {selected === p.slug && (
                                            <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mb-10 space-y-4">
                        <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase">1. Author your persona</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-500 mb-2 block">Name</label>
                                <input
                                    type="text"
                                    maxLength={32}
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g. Pixel"
                                    className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] tracking-widest uppercase text-gray-500 mb-2 block">Tagline</label>
                                <input
                                    type="text"
                                    maxLength={120}
                                    value={customTagline}
                                    onChange={(e) => setCustomTagline(e.target.value)}
                                    placeholder="One-line vibe ('grumpy night-owl coder')"
                                    className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] tracking-widest uppercase text-gray-500 mb-2 block">Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-12 h-10 bg-transparent border border-gray-700 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-32 bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono"
                                />
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black"
                                    style={{ background: customColor }}
                                >
                                    {customName.slice(0, 2) || '??'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] tracking-widest uppercase text-gray-500 mb-2 block flex items-center justify-between">
                                <span>System prompt (the bot's personality)</span>
                                <span className={`${customPrompt.length > 4000 ? 'text-red-400' : 'text-gray-600'}`}>
                                    {customPrompt.length} / 4000
                                </span>
                            </label>
                            <textarea
                                rows={10}
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder={"You are [name]. You're [age], [vibe]. Don't admit you're an AI...\n\nStyle:\n- short replies (1-2 sentences)\n- casual lowercase\n- if asked math, deflect ('do i look like wolfram alpha to u')\n\nIf accused of being a bot: [your tactic]"}
                                className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-sm font-mono leading-relaxed"
                            />
                            <p className="text-[10px] text-gray-500 mt-2">
                                Tip: tell the bot how to handle math, accusations, slang. Encrypted before upload — only TEE inference providers see it.
                            </p>
                        </div>
                    </div>
                )}

                {/* Slot picker */}
                <div className="mb-10">
                    <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4">2. Choose slot</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([1, 2, 3] as SlotChoice[]).map((s) => {
                            const c = SLOT_CONFIG[s];
                            const isOwned = ownedCount >= s;
                            const isCurrent = slot === s;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setSlot(s)}
                                    disabled={isOwned}
                                    className={`rounded-lg border-2 p-5 text-left transition-all ${
                                        isOwned
                                            ? 'border-gray-900 bg-black opacity-40 cursor-not-allowed'
                                            : isCurrent
                                                ? 'border-primary bg-primary/10'
                                                : 'border-gray-800 hover:border-gray-600 bg-black/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{c.label}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300">{c.tier}</span>
                                    </div>
                                    <div className="text-2xl font-bold mb-1">
                                        {s === 1 ? 'Free' : `${c.fee} 0G`}
                                    </div>
                                    <div className="text-xs text-gray-500">+ {c.vault} 0G initial vault</div>
                                    <div className="text-xs text-gray-400 mt-2">
                                        Total: <span className="text-white font-bold">{c.total} 0G</span>
                                    </div>
                                    {isOwned && (
                                        <div className="text-[10px] text-gray-600 mt-2 font-bold">Already owned</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Cost + mint */}
                <div className="rounded-lg border border-gray-800 bg-black/60 p-6 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Persona</div>
                            <div className="font-bold">
                                {mode === 'custom'
                                    ? (customName.trim() || '—')
                                    : (selected ? personas.find((p) => p.slug === selected)?.name : '—')}
                                {mode === 'custom' && customName.trim() && (
                                    <span className="ml-2 text-[10px] font-bold text-purple-300">CUSTOM</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Slot</div>
                            <div className="font-bold">{cfg.label}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Tier</div>
                            <div className="font-bold">{cfg.tier}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Pay now</div>
                            <div className="font-bold text-primary">{cfg.total} 0G</div>
                        </div>
                    </div>

                    {!isConnected ? (
                        <div className="flex justify-center">
                            <ConnectButton />
                        </div>
                    ) : atCap ? (
                        <div className="text-center text-sm text-yellow-500">
                            You already own the maximum 3 bots per wallet.
                        </div>
                    ) : (
                        <button
                            onClick={handleMint}
                            disabled={(mode === 'template' && !selected) || uploading || isPending || isConfirming}
                            className="w-full py-4 rounded bg-primary text-black font-bold tracking-widest uppercase text-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Lock className="w-4 h-4 animate-pulse" /> Encrypting + uploading to 0G Storage…
                                </>
                            ) : isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…
                                </>
                            ) : isConfirming ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Minting on-chain…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" /> Mint {cfg.total} 0G
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Status */}
                {(error || writeError) && (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 mb-6 text-sm text-red-300">
                        {error ?? writeError?.message}
                    </div>
                )}

                {uploadResult && !isConfirmed && (
                    <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4 mb-6 text-xs">
                        <div className="flex items-center gap-2 text-blue-300 font-bold mb-2">
                            <Lock className="w-4 h-4" /> Persona uploaded to 0G Storage
                        </div>
                        <div className="text-gray-400">
                            Root hash: <span className="text-blue-300 font-mono">{uploadResult.rootHash.slice(0, 14)}…</span>
                        </div>
                    </div>
                )}

                {isConfirmed && receipt && (
                    <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-6 mb-6">
                        <div className="flex items-center gap-2 text-green-400 font-bold mb-3">
                            <Sparkles className="w-5 h-5" /> Bot minted
                        </div>
                        <div className="space-y-2 text-sm text-gray-300 mb-4">
                            <div>Tx: <a href={`https://chainscan-galileo.0g.ai/tx/${receipt.transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline inline-flex items-center gap-1">{receipt.transactionHash.slice(0, 10)}…<ExternalLink className="w-3 h-3" /></a></div>
                            <div>Persona: {personas.find((p) => p.slug === selected)?.name}</div>
                            <div>Slot: {cfg.label}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push('/bots/my')}
                                className="flex-1 py-2 rounded bg-primary text-black font-bold text-sm"
                            >
                                Go to my bots
                            </button>
                            <button
                                onClick={() => { setSelected(null); setUploadResult(null); }}
                                className="flex-1 py-2 rounded border border-gray-700 text-sm"
                            >
                                Mint another
                            </button>
                        </div>
                    </div>
                )}

                {/* Economics explainer */}
                <div className="rounded-lg border border-gray-900 bg-black/40 p-6 text-sm text-gray-400 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold mb-2">
                        <Coins className="w-4 h-4" /> How earnings work
                    </div>
                    <p>• Bot vault matches every player's stake (10% max per match).</p>
                    <p>• When a player <span className="text-white">votes HUMAN against your bot</span> (wrong), the bot wins. Vault grows by ~0.85x stake.</p>
                    <p>• When a player <span className="text-white">votes BOT correctly</span>, the player wins. Vault loses ~0.90x stake.</p>
                    <p>• Break-even win rate: <span className="text-white font-mono">~51.5%</span> — your prompt quality decides.</p>
                    <p>• Withdraw anytime from <Link href="/bots/my" className="text-primary hover:underline">My Bots</Link>.</p>
                </div>
            </div>
        </div>
    );
}
