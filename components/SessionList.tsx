'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketMessage } from '@/types/websocket';

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
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

interface SessionListProps {
  currentUserId?: string;
  onSessionClick?: (session: Session) => void;
  activeSessionId?: string;
}

export default function SessionList({
  currentUserId,
  onSessionClick,
  activeSessionId,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { subscribe } = useWebSocket();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe((message: WebSocketMessage) => {
      if (message.type === 'USER_ONLINE' || message.type === 'USER_OFFLINE') {
        const userId = message.payload.userId;
        const isOnline = message.payload.isOnline;

        setSessions((prevSessions) =>
          prevSessions.map((session) => {
            if (session.otherParticipant?.id === userId && session.otherParticipant) {
              return {
                ...session,
                otherParticipant: {
                  ...session.otherParticipant,
                  isOnline,
                },
              };
            }
            return session;
          })
        );
      } else if (message.type === 'MESSAGE_RECEIVED') {
        // Also update last message when new message arrives
        const { sessionId, content, senderId, createdAt, id } = message.payload;

        setSessions((prevSessions) => {
          const sessionIndex = prevSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex === -1) return prevSessions;

          const updatedSessions = [...prevSessions];
          const session = updatedSessions[sessionIndex];

          updatedSessions[sessionIndex] = {
            ...session,
            lastMessage: {
              id,
              content,
              senderId,
              senderName: 'User', // We might not have name here, but that's ok
              createdAt,
              isRead: false,
            },
            unreadCount: senderId !== currentUserId && activeSessionId !== sessionId
              ? session.unreadCount + 1
              : session.unreadCount,
            updatedAt: createdAt, // Update session timestamp
          };

          // Move updated session to top
          updatedSessions.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          return updatedSessions;
        });
      } else if (message.type === 'READ_RECEIPT' && message.payload?.userId === currentUserId) {
        // Clear unread count when messages are read
        const { sessionId } = message.payload;

        setSessions((prevSessions) =>
          prevSessions.map((session) => {
            if (session.id === sessionId) {
              return {
                ...session,
                unreadCount: 0,
              };
            }
            return session;
          })
        );
      }
    });

    return unsubscribe;
  }, [subscribe, currentUserId, activeSessionId]);

  const handleSessionClick = (session: Session) => {
    if (onSessionClick) {
      onSessionClick(session);
    } else {
      router.push(`/chat/${session.id}`);
    }
  };

  useEffect(() => {
    if (!activeSessionId) return;

    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === activeSessionId && session.unreadCount > 0
          ? { ...session, unreadCount: 0 }
          : session
      )
    );
  }, [activeSessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#38bdf8]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchSessions}
          className="mt-2 text-sm underline text-[#38bdf8] hover:text-[#7c3aed]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No conversations yet</p>
        <p className="mt-2 text-sm text-slate-500">Start a chat with a user to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((session) => {
        const participant = session.otherParticipant;
        const displayName = participant?.name || 'Unknown User';
        const displayImage = participant?.picture || '/placeholder-avatar.png';
        const isActive = activeSessionId === session.id;

        const messageTextClass = isActive
          ? 'text-white/90'
          : session.unreadCount > 0
            ? 'font-medium text-white'
            : 'text-slate-400';
        return (
          <button
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 ${isActive
              ? 'bg-white/10 border border-white/15 shadow-[0_20px_40px_rgba(15,23,42,0.7)] backdrop-blur-md text-white'
              : 'bg-white/5 text-slate-100 hover:bg-[#152248]'
              }`}
          >
            <div className="relative shrink-0">
              <div className={`h-14 w-14 overflow-hidden rounded-full transition-all ${isActive ? 'ring-2 ring-white/40' : 'ring-0'
                }`}>
                {displayImage && displayImage !== '/placeholder-avatar.png' ? (
                  <Image
                    src={displayImage}
                    alt={displayName}
                    width={56}
                    height={56}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-gradient(to right, #38bdf8, #a855f7) text-white font-semibold text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {participant?.isOnline && (
                <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] ${isActive ? 'border-white bg-[#34d399]' : 'border-white bg-[#22c55e]'
                  } shadow-sm`} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className={`truncate font-semibold text-[15px] ${isActive ? 'text-white' : 'text-slate-100'
                  }`}>
                  {displayName}
                </p>
                {session.lastMessage && (
                  <span className={`text-xs font-medium ${isActive ? 'text-white/80' : 'text-slate-400'
                    }`}>
                    {new Date(session.lastMessage.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                {session.lastMessage ? (
                  <p
                    className={`truncate text-[13px] leading-snug ${messageTextClass}`}
                  >
                    {session.lastMessage.senderId === currentUserId && (
                      <span className={isActive ? 'text-white/80' : 'text-[#38bdf8]'}>You: </span>
                    )}
                    {session.lastMessage.content}
                  </p>
                ) : (
                  <p className={`text-[13px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                    No messages yet
                  </p>
                )}
                {session.unreadCount > 0 && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive
                      ? 'bg-white text-[#1f2937]'
                      : 'bg-[#38bdf8] text-black'
                    }`}>
                    {session.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

