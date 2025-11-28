'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { startAIChatSession } from '@/lib/services/ai.service';

export default function AIChatButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleStartAIChat = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const aiSession = await startAIChatSession();
      router.push(`/chat/${aiSession.id}`);
    } catch (error) {
      console.error('Error starting AI chat:', error);
      alert('Failed to start AI chat. Please make sure Gemini API key is configured.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStartAIChat}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-medium text-white transition-colors hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Starting...
        </>
      ) : (
        <>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Chat with AI
        </>
      )}
    </button>
  );
}

