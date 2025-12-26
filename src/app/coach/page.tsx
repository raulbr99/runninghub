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
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CoachContent />
    </Suspense>
  );
}
