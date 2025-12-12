'use client';

import Navbar from '@/components/Navbar';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background font-mono relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-muted">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">USER PROFILE</h1>
          <p className="text-gray-500">[ UNDER_CONSTRUCTION ]</p>
        </div>
      </div>
    </main>
  );
}
