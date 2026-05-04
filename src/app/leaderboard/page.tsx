'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, Search, User, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';

interface LeaderboardRow {
    address: string;
    exp: number;
    gamesPlayed: number;
    gamesWon: number;
    referralCount: number;
}

interface LeaderboardResponse {
    leaderboard: LeaderboardRow[];
    totalExp: number;
    totalPlayers: number;
}

const WS_URL = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
    ? '' // same-origin via Caddy proxy in prod
    : 'http://localhost:3001';

export default function LeaderboardPage() {
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const { address } = useAccount();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        setLoading(true);
        const baseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
            ? window.location.origin
            : 'http://localhost:3001';
        fetch(`${baseUrl}/api/exp-leaderboard`)
            .then((r) => r.json())
            .then((d: LeaderboardResponse) => {
                setData(d);
                setLoading(false);
            })
            .catch((e) => {
                setError(e.message ?? 'Failed to load');
                setLoading(false);
            });
    }, [mounted]);

    if (!mounted) return null;

    const rows = data?.leaderboard ?? [];
    const filtered = search.trim()
        ? rows.filter((r) => r.address.toLowerCase().includes(search.toLowerCase()))
        : rows;

    const myRow = address
        ? rows.findIndex((r) => r.address.toLowerCase() === address.toLowerCase())
        : -1;

    return (
        <main className="min-h-screen bg-background font-mono relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <Navbar />

            <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-8 flex-1 flex flex-col z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-8 bg-primary" />
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                LEADERBOARD <span className="text-primary text-2xl md:text-3xl font-normal">// 0xP</span>
                            </h1>
                        </div>
                        <p className="text-gray-400 max-w-lg text-sm">
                            Cumulative 0xP across players. Earn 100 0xP per win, 25 per match, +200 per referral.
                            Snapshot to airdrop in Phase 4 (see roadmap).
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-secondary/30 border border-muted p-4 rounded min-w-[140px]">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total 0xP</div>
                            <div className="text-xl font-bold text-white">
                                {data ? (data.totalExp ?? 0).toLocaleString() : '—'}
                            </div>
                        </div>
                        <div className="bg-secondary/30 border border-muted p-4 rounded min-w-[140px]">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Active Players</div>
                            <div className="text-xl font-bold text-primary">
                                {data ? (data.totalPlayers ?? 0).toLocaleString() : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="text-xs text-gray-500 tracking-widest uppercase">All time</div>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="> Search wallet address..."
                            className="w-full md:w-80 bg-secondary/30 border border-muted rounded py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="border border-muted rounded-lg overflow-hidden bg-secondary/20 mb-8">
                    <div className="overflow-x-auto">
                        <div className="min-w-[640px]">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-muted text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                <div className="col-span-1">Rank</div>
                                <div className="col-span-5">Player</div>
                                <div className="col-span-2 text-right">Played</div>
                                <div className="col-span-2 text-center">Win Rate</div>
                                <div className="col-span-2 text-right text-primary">0xP</div>
                            </div>

                            <div className="divide-y divide-muted/30">
                                {loading ? (
                                    <div className="p-12 text-center text-gray-500 text-sm">Loading…</div>
                                ) : error ? (
                                    <div className="p-12 text-center text-red-400 text-sm">
                                        Failed to load leaderboard: {error}
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 text-sm">
                                        {search ? 'No matches.' : 'No players yet — be the first to play.'}
                                    </div>
                                ) : (
                                    filtered.map((row, idx) => {
                                        const rank = rows.indexOf(row) + 1;
                                        const isMe = address && row.address.toLowerCase() === address.toLowerCase();
                                        const winRate = (row.gamesPlayed ?? 0) === 0 ? 0 : Math.round(((row.gamesWon ?? 0) / (row.gamesPlayed ?? 0)) * 100);
                                        const short = `${row.address.slice(0, 6)}…${row.address.slice(-4)}`;
                                        return (
                                            <div
                                                key={row.address}
                                                className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group ${isMe ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                                            >
                                                <div className="col-span-1 font-bold text-lg flex items-center gap-2">
                                                    {rank <= 3 && (
                                                        <Trophy className={`w-4 h-4 ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                                                    )}
                                                    <span className={rank <= 3 ? 'text-white' : 'text-gray-500'}>
                                                        {rank.toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <div className="col-span-5 flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${rank === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                            {short}
                                                            {isMe && <span className="text-[10px] text-primary">(you)</span>}
                                                        </div>
                                                        <a
                                                            href={`https://chainscan-galileo.0g.ai/address/${row.address}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-gray-500 hover:text-primary inline-flex items-center gap-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            explorer <ExternalLink className="w-2.5 h-2.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-right text-gray-300 font-medium">{(row.gamesPlayed ?? 0)}</div>
                                                <div className="col-span-2 flex justify-center">
                                                    <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${winRate >= 80 ? 'bg-green-500/10 text-green-500 border border-green-500/30' : winRate >= 50 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                                        {winRate}%
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-right font-bold text-primary">
                                                    {(row.exp ?? 0).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* My position */}
                {address && (
                    <div className="border-t border-primary/30 bg-black/50 backdrop-blur-md p-4 rounded-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/20 rounded border border-primary/50 flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-primary uppercase tracking-wider font-bold">You</div>
                                    <div className="text-white font-bold text-sm">{`${address.slice(0, 6)}…${address.slice(-4)}`}</div>
                                </div>
                            </div>
                            <div className="flex gap-8 text-center">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">My Rank</div>
                                    <div className="text-white font-bold">{myRow >= 0 ? `#${myRow + 1}` : '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">My 0xP</div>
                                    <div className="text-primary font-bold">
                                        {myRow >= 0 ? (rows[myRow].exp ?? 0).toLocaleString() : '0'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
