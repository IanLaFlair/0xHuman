'use client';

import { useParams, useSearchParams } from 'next/navigation';
import GameTerminal from '@/components/GameTerminal';

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const arenaId = params.id as string;
  const stake = searchParams.get('stake') || '50';

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <GameTerminal arenaId={arenaId} stakeAmount={stake} />
    </main>
  );
}
