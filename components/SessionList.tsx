'use client';

import { KeyboardEvent, useEffect, useState, type MouseEvent } from 'react';
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
  onSessionDelete?: (sessionId: string) => void;
  activeSessionId?: string;
}

const getMessageTextClass = (isActive: boolean, unreadCount: number) => {
  if (isActive) return 'text-white/90';
  if (unreadCount > 0) return 'font-medium text-white';
  return 'text-slate-400';
};

export default function SessionList({
  currentUserId,
  onSessionClick,
  onSessionDelete,
  activeSessionId,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sessions/${pendingDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete session';
        try {
          const body = await response.json();
          errorMessage = body?.error || body?.message || errorMessage;
        } catch {
          const text = await response.text().catch(() => '');
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      setSessions((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      onSessionDelete?.(pendingDelete.id);
      if (activeSessionId === pendingDelete.id) {
        router.push('/chats');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete the session. Please try again.');
    } finally {
      setPendingDelete(null);
      setIsDeleting(false);
    }
  };
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
      } else if (message.type === 'SESSION_CREATED') {
        // A new session was created; refresh from server so both sides see it
        fetchSessions();
      } else if (message.type === 'SESSION_DELETED') {
        // A session was deleted; remove it from local state immediately
        const { sessionId } = message.payload;
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else if (message.type === 'MESSAGE_RECEIVED') {
        const { sessionId, content, senderId, createdAt } = message.payload;
        const messageId = message.payload.messageId || message.payload.id;

        setSessions((prevSessions) => {
          const sessionIndex = prevSessions.findIndex((s) => s.id === sessionId);

          // If session not in list, fetch sessions to get the new one
          if (sessionIndex === -1) {
            setTimeout(() => fetchSessions(), 100);
            return prevSessions;
          }

          const session = prevSessions[sessionIndex];
          const isOwnMessage = senderId === currentUserId;
          const isActive = sessionId === activeSessionId;
          const unreadCount =
            !isOwnMessage && !isActive ? session.unreadCount + 1 : session.unreadCount;

          const updatedSession: Session = {
            ...session,
            lastMessage: {
              id: messageId,
              content,
              senderId,
              senderName: isOwnMessage ? 'You' : (session.otherParticipant?.name || 'User'),
              createdAt,
              isRead: isOwnMessage,
            },
            unreadCount,
            updatedAt: createdAt,
          };

          const updatedSessions = [...prevSessions];
          updatedSessions[sessionIndex] = updatedSession;
          updatedSessions.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          return updatedSessions;
        });
      } else if (message.type === 'READ_RECEIPT' && message.payload?.userId === currentUserId) {
        const { sessionId } = message.payload;
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === sessionId && session.unreadCount > 0
              ? { ...session, unreadCount: 0 }
              : session
          )
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
    <div className="space-y-1 relative">
      {sessions.map((session) => {
        const participant = session.otherParticipant;
        const displayName = participant?.name || 'Unknown User';
        const displayImage = participant?.picture || '/placeholder-avatar.png';
        const isActive = activeSessionId === session.id;

        const messageTextClass = getMessageTextClass(isActive, session.unreadCount);

        const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          setPendingDelete(session);
        };

        const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSessionClick(session);
          }
        };

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSessionClick(session)}
            onKeyDown={handleRowKeyDown}
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
            <button
              onClick={handleDelete}
              className="ml-3 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200 hover:text-white transition"
            >
              Delete
            </button>
              </div>
            </div>
          </div>
        );
      })}
      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0f172a]/90 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h3 className="text-lg font-semibold">
              Delete conversation with {pendingDelete.otherParticipant?.name || 'this user'}?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              This will remove the entire chat history permanently.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

