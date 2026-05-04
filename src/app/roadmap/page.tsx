'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import RoadmapTimeline from '@/components/RoadmapTimeline';

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8 font-mono">
      <Navbar />
      <div className="max-w-4xl mx-auto mt-8">
        <RoadmapTimeline />
      </div>
    </main>
  );
}
