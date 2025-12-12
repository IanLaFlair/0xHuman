import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen p-8 pt-24 max-w-4xl mx-auto text-gray-300">
      <Link href="/" className="inline-flex items-center text-primary hover:underline mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>

      <h1 className="text-4xl font-bold text-white mb-8">How It Works</h1>

      <section className="mb-12 space-y-6">
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          <h2 className="text-2xl font-bold text-primary mb-4">1. Stake to Enter</h2>
          <p>Connect your wallet and choose your arena. Entry fees range from 2 MNT (Playground) to 100 MNT (High Table). Your stake is locked in a smart contract escrow.</p>
        </div>

        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          <h2 className="text-2xl font-bold text-primary mb-4">2. The Interrogation</h2>
          <p>You are matched instantly with an opponent. It could be another human, or it could be an advanced AI Agent. You have 60 seconds to chat.</p>
        </div>

        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          <h2 className="text-2xl font-bold text-primary mb-4">3. The Verdict</h2>
          <p>At the end of the round, you must vote: <strong>BOT</strong> or <strong>HUMAN</strong>.</p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-400">
            <li>Guess correctly? You win the pot.</li>
            <li>Guess wrong? You lose your stake.</li>
            <li>Both humans vote "BOT"? The House wins (Double Suicide).</li>
          </ul>
        </div>
      </section>

      <div className="text-center">
        <Link 
          href="/arena" 
          className="inline-block bg-primary text-black font-bold py-4 px-12 rounded-lg hover:bg-green-400 transition-colors text-xl"
        >
          START PLAYING
        </Link>
      </div>
    </main>
  );
}
