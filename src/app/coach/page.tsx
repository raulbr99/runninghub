'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CoachChatComponent from '@/components/CoachChatComponent';

function CoachContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation') || undefined;

  return (
    <div className="h-screen">
      <CoachChatComponent conversationId={conversationId} />
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CoachContent />
    </Suspense>
  );
}
