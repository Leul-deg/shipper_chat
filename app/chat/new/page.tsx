'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

export default function NewChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = searchParams.get('userId');

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
      return;
    }

    if (isPending || !session) {
      return;
    }

    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    // Create or get session
    const createSession = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create session');
        }

        const data = await response.json();
        // Redirect to chat page
        router.push(`/chat/${data.session.id}`);
      } catch (err) {
        console.error('Error creating session:', err);
        setError(err instanceof Error ? err.message : 'Failed to create session');
        setLoading(false);
      }
    };

    createSession();
  }, [userId, session, status, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500" />
          <p className="text-zinc-600 dark:text-zinc-400">Creating chat session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => router.push('/users')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return null;
}

