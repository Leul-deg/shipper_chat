'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import ChatWindow from '@/components/ChatWindow';
import SessionList from '@/components/SessionList';
import ProfileDropdown from '@/components/ProfileDropdown';
import LogoBadge from '@/components/LogoBadge';
import AIInfoCard from '@/components/AIInfoCard';
import { startAIChatSession } from '@/lib/services/ai.service';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketMessage } from '@/types/websocket';

interface ChatSession {
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

interface User {
    id: string;
    name: string;
    email: string;
    picture: string | null;
    isOnline: boolean;
}

export default function ChatsPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);

    const filteredSearchResults = useMemo(() => {
        if (!session) return [];
        return searchResults.filter(
            (user) =>
                user.id !== session.user.id &&
                user.id !== activeChatSession?.otherParticipant?.id
        );
    }, [searchResults, session, activeChatSession]);

    const userParticipant = activeChatSession?.otherParticipant ?? null;
    const [aiLoading, setAILoading] = useState(false);
    const [aiError, setAIError] = useState<string | null>(null);
    const handleStartAIChat = async () => {
        if (!session?.user?.id) return;
        setAIError(null);
        setAILoading(true);
        try {
            const aiSession = await startAIChatSession();
            setActiveSessionId(aiSession.id);
        } catch (error) {
            console.error('Failed to start AI chat:', error);
            setAIError(error instanceof Error ? error.message : 'Failed to start AI chat.');
        } finally {
            setAILoading(false);
        }
    };

    const aiCard = (
        <AIInfoCard
            onStartAIChat={handleStartAIChat}
            isLoading={aiLoading}
            error={aiError}
        />
    );

    const userCard = userParticipant ? (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0f172a]/80 p-5 text-white shadow-[0_20px_40px_rgba(2,6,23,0.55)]">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/5">
                    {userParticipant.picture ? (
                        <Image
                            src={userParticipant.picture}
                            alt={userParticipant.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-gradient(to right, #38bdf8, #a855f7) text-white font-semibold text-xl">
                            {userParticipant.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-lg font-semibold leading-tight text-white">
                        {userParticipant.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                        {userParticipant.isOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">
                    Email
                </p>
                <p className="text-sm text-white/90 wrap-break-word whitespace-pre-wrap">
                    {userParticipant.email || 'Not provided'}
                </p>
            </div>
            <div className="space-y-1 text-sm text-slate-300">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    Last active
                </p>
                <p>
                    {new Date(activeChatSession?.updatedAt || '').toLocaleString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                    })}
                </p>
            </div>
        </div>
    ) : null;

    useEffect(() => {
        if (!isPending && !session) {
            router.push('/auth/signin');
        }
    }, [session, isPending, router]);

    // Fetch session details when activeSessionId changes
    useEffect(() => {
        if (!activeSessionId || !session) return;

        const fetchSession = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/sessions/${activeSessionId}`);
                if (!response.ok) throw new Error('Failed to fetch session');
                const data = await response.json();
                setActiveChatSession(data.session);
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [activeSessionId, session]);

    // Subscribe to real-time updates for active session
    const { subscribe } = useWebSocket();

    useEffect(() => {
        const unsubscribe = subscribe((message: WebSocketMessage) => {
            // Handle session deletion - close chat if it was deleted by the other user
            if (message.type === 'SESSION_DELETED') {
                const { sessionId } = message.payload;
                if (activeSessionId === sessionId) {
                    setActiveSessionId(null);
                    setActiveChatSession(null);
                }
            }

            // Handle online/offline status updates
            if (activeChatSession && (message.type === 'USER_ONLINE' || message.type === 'USER_OFFLINE')) {
                const userId = message.payload.userId;
                const isOnline = message.payload.isOnline;

                if (activeChatSession.otherParticipant?.id === userId) {
                    setActiveChatSession((prev) => {
                        if (!prev || !prev.otherParticipant) return prev;
                        return {
                            ...prev,
                            otherParticipant: {
                                ...prev.otherParticipant,
                                isOnline,
                            },
                        };
                    });
                }
            }
        });

        return unsubscribe;
    }, [subscribe, activeChatSession, activeSessionId]);

    // Search users
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const searchUsers = async () => {
            try {
                setSearching(true);
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                if (!response.ok) throw new Error('Search failed');
                const data = await response.json();
    setSearchResults(data.users || []);
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleUserClick = async (userId: string) => {
        try {
            setLoading(true);
            setSearchQuery(''); // Clear search

            // Create or get session
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session?.user?.id, otherUserId: userId }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to create session');
            }
            setActiveSessionId(data.session.id);
        } catch (error) {
            console.error('Error creating session:', error);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="flex h-screen flex-col bg-linear-to-b from-[#050b15] via-[#070d1b] to-[#0b1224] text-slate-100 overflow-hidden">
            {/* Header - Clean Apple Style */}
            <header className="border-b border-white/10 bg-[#0d1526]/90 px-6 py-4 z-20 shadow-[0_20px_60px_rgba(2,6,23,0.65)]">
                <div className="flex items-center w-full justify-between">
                    <div className="flex items-center gap-3">
                        <LogoBadge />
                        <h1 className="text-xl font-semibold text-white">Shipper Chat</h1>
                    </div>
                        <ProfileDropdown
                            user={session.user}
                            onSignOut={() => {
                                signOut();
                                router.push('/auth/signin');
                            }}
                        />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:flex-row overflow-hidden w-full py-4 px-4 lg:px-6 gap-4">
                {/* Sidebar - Clean & Airy */}
                <aside className="lg:w-[260px] w-full border-r lg:border-r border-white/10 bg-[#0b1224]/80 flex flex-col z-10 shadow-[0_30px_60px_rgba(1,4,17,0.65)] backdrop-blur-lg">
                    {/* Search Bar */}
                    <div className="p-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-[#111c33] py-3 pl-11 pr-4 text-[15px] font-normal text-white placeholder:text-slate-500 focus:ring-0 focus:border-[#38bdf8] focus:bg-[#111c33]"
                            />
                            <svg
                                className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Search Results or Session List */}
                    <div className="flex-1 overflow-y-auto px-2 no-scrollbar">
                        {searchQuery.trim() ? (
                            // Search Results
                            <div className="space-y-1">
                                {searching ? (
                                    <div className="flex justify-center py-12">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-[#38bdf8]" />
                                    </div>
                        ) : filteredSearchResults.length > 0 ? (
                            filteredSearchResults.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserClick(user.id)}
                                                    className="group flex w-full items-center gap-3 rounded-2xl p-3 transition-all hover:bg-[#16243d]"
                                        >
                                            <div className="relative shrink-0">
                                                        <div className="h-11 w-11 overflow-hidden rounded-full bg-white/5 ring-2 ring-transparent group-hover:ring-white/40 transition-all">
                                                    {user.picture ? (
                                                        <img
                                                            src={user.picture}
                                                            alt={user.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#38bdf8] to-[#a855f7] text-white font-medium text-sm">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                {user.isOnline && (
                                                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b1224] bg-[#34d399]" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                        <p className="font-semibold text-white text-[15px]">
                                                    {user.name}
                                                </p>
                                                        <p className="truncate text-[13px] text-slate-400">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-16 text-center">
                                                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-sm">
                                                    <svg className="h-7 w-7 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                                <p className="text-[15px] font-medium text-white">No users found</p>
                                                <p className="text-[13px] text-slate-400 mt-1">Try a different search term</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Session List
                            <SessionList
                                currentUserId={session.user.id}
                                activeSessionId={activeSessionId || undefined}
                                onSessionClick={(s) => setActiveSessionId(s.id)}
                                onSessionDelete={(deletedId) => {
                                    setActiveSessionId((prev) => (prev === deletedId ? null : prev));
                                }}
                            />
                        )}
                    </div>
                </aside>

                {/* Chat Window */}
                <main className="flex flex-1 flex-col lg:flex-row overflow-hidden relative lg:gap-6">
                    <div className="flex-1 min-h-0">
                    {activeSessionId && activeChatSession ? (
                        loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[#38bdf8]" />
                            </div>
                        ) : (
                                <ChatWindow
                                    sessionId={activeSessionId}
                                    currentUserId={session.user.id}
                                    otherParticipant={activeChatSession.otherParticipant}
                                />
                        )
                    ) : (
                        <div className="flex flex-1 items-center justify-center relative z-10">
                                <div className="text-center max-w-md px-8 py-10 bg-[#0f172a]/90 rounded-3xl shadow-[0_20px_60px_rgba(2,6,23,0.55)] border border-white/10">
                                    <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-linear-gradient(to right, #38bdf8, #a855f7) flex items-center justify-center">
                                        <svg className="h-10 w-10 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                    <h2 className="mb-3 text-2xl font-semibold text-white">
                                    Select a chat
                                </h2>
                                    <p className="text-slate-300 text-[15px] leading-relaxed">
                                    Choose from your conversations or search for someone new to connect with.
                                </p>
                            </div>
                        </div>
                    )}
                    </div>
                    <aside className="hidden w-[280px] shrink-0 flex-col gap-6 self-start rounded-3xl border border-white/10 bg-[#0f172a]/80 p-5 text-white shadow-[0_30px_60px_rgba(2,6,23,0.6)] lg:flex ml-auto max-h-[70%]">
                        {userCard}
                        {aiCard}
                    </aside>
                </main>
            </div>
        </div>
    );
}
