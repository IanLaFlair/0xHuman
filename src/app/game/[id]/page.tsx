'use client';

import { useParams } from 'next/navigation';
import GameTerminal from '@/components/GameTerminal';

export default function GamePage() {
  const params = useParams();
  const arenaId = params.id as string;

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <GameTerminal arenaId={arenaId} />
    </main>
  );
}
