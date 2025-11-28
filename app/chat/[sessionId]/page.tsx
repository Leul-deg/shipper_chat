'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import ChatWindow from '@/components/ChatWindow';
import SessionList from '@/components/SessionList';
import UserList from '@/components/UserList';
import UserProfile from '@/components/UserProfile';

interface Session {
  id: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  otherParticipant: {
    id: string;
    name: string;
    email: string | null;
    picture: string | null;
    isOnline: boolean;
  } | null;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const sessionId = params.sessionId as string;

  const [chatSession, setChatSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
      return;
    }

    if (isPending || !session) {
      return;
    }

    // Fetch session details
    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Session not found');
          } else {
            throw new Error('Failed to fetch session');
          }
          return;
        }
        const data = await response.json();
        setChatSession(data.session);
        setError(null);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load chat session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, session, isPending, router]);

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500" />
      </div>
    );
  }

  if (!session) {
    return null;
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

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">
            Shipper Chat
          </h1>
          <div className="flex items-center gap-4">
            <UserProfile user={session.user} size="sm" />
            <button
              onClick={() => {
                signOut();
                router.push('/auth/signin');
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Sessions and Users */}
        <aside className="w-80 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex">
                <button className="flex-1 border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 dark:border-blue-500 dark:text-blue-400">
                  Chats
                </button>
                <button
                  onClick={() => router.push('/users')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Users
                </button>
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto">
              <SessionList
                currentUserId={session.user.id}
                activeSessionId={sessionId}
                onSessionClick={(s) => router.push(`/chat/${s.id}`)}
              />
            </div>
          </div>
        </aside>

        {/* Chat Window */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {chatSession ? (
            <ChatWindow
              sessionId={sessionId}
              currentUserId={session.user.id}
              otherParticipant={chatSession.otherParticipant}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Loading chat...
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

