'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UserList from '@/components/UserList';
import UserProfile from '@/components/UserProfile';
import AIChatButton from '@/components/AIChatButton';

export default function UsersPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500" />
      </div>
    );
  }

  if (!session) {
    return null;
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
        {/* Sidebar - User List */}
        <aside className="w-80 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <AIChatButton />
          </div>
          <UserList
            onUserClick={(user) => {
              router.push(`/chat/new?userId=${user.id}`);
            }}
            currentUserId={session.user.id}
          />
        </aside>

        {/* Main Area */}
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-semibold text-black dark:text-white">
              Select a user to start chatting
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Choose a user from the sidebar to begin a conversation
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

