'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketMessage } from '@/types/websocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Image from 'next/image';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    picture: string | null;
  };
  createdAt: string;
  isRead: boolean;
}

interface ChatWindowProps {
  sessionId: string;
  currentUserId: string;
  otherParticipant?: {
    id: string;
    name: string;
    email?: string | null;
    picture: string | null;
    isOnline: boolean;
  } | null;
}

export default function ChatWindow({
  sessionId,
  currentUserId,
  otherParticipant,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/messages?sessionId=${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Set up WebSocket connection
  const { isConnected, subscribe, sendMessage } = useWebSocket();

  // Handle typing indicator
  const handleTyping = (isTyping: boolean) => {
    if (sendMessage && sessionId) {
      sendMessage({
        type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
        payload: {
          userId: currentUserId,
          sessionId,
          isTyping,
        },
        timestamp: Date.now(),
      });
    }
  };

  // Subscribe to new messages and typing indicators
  useEffect(() => {
    const unsubscribe = subscribe((message: WebSocketMessage) => {
      if (
        message.type === 'MESSAGE_RECEIVED' &&
        message.payload?.sessionId === sessionId
      ) {
        // Get the real message ID (server sends both id and messageId for compatibility)
        const realMessageId = message.payload.messageId || message.payload.id;
        const other = otherParticipant;
        const isOwnMessage = message.payload.senderId === currentUserId;
        const isOtherSender = other && message.payload.senderId === other.id;

        const newMessage: Message = {
          id: realMessageId,
          content: message.payload.content,
          senderId: message.payload.senderId,
          sender: {
            id: message.payload.senderId,
            name: isOtherSender
              ? other.name
              : isOwnMessage
                ? 'You'
                : 'User',
            picture: isOtherSender ? other.picture : null,
          },
          createdAt: message.payload.createdAt,
          isRead: isOwnMessage, // Own messages are "read" by definition
        };

        setMessages((prev) => {
          // Remove any pending optimistic message that matches this confirmed message
          const withoutPending = prev.filter((msg) => {
            // Remove pending messages from same sender with same content
            if (
              msg.id?.startsWith('pending-') &&
              msg.senderId === message.payload.senderId &&
              msg.content === message.payload.content
            ) {
              return false;
            }
            return true;
          });

          // Don't add if we already have this exact message ID
          if (withoutPending.some((msg) => msg.id === realMessageId)) {
            return withoutPending;
          }

          return [...withoutPending, newMessage];
        });

        // Mark as read if it's not from current user (send read receipt)
        if (!isOwnMessage) {
          fetch(`/api/messages/${realMessageId}`, { method: 'PATCH' }).catch(
            console.error
          );
        }

        // Clear typing indicator when message is received
        if (!isOwnMessage) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(message.payload.senderId);
            return next;
          });
        }
      } else if (
        (message.type === 'TYPING_START' || message.type === 'TYPING_STOP') &&
        message.payload?.sessionId === sessionId &&
        message.payload?.userId !== currentUserId
      ) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (message.type === 'TYPING_START') {
            next.add(message.payload.userId);
          } else {
            next.delete(message.payload.userId);
          }
          return next;
        });
      }
    });

    return unsubscribe;
  }, [subscribe, sessionId, currentUserId, otherParticipant]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [sessionId]);

  // Send read receipt when messages are loaded or when sessionId changes
  useEffect(() => {
    if (messages.length > 0 && sendMessage && sessionId) {
      sendMessage({
        type: 'READ_RECEIPT',
        payload: {
          sessionId,
        },
        timestamp: Date.now(),
      });
    }
  }, [messages.length, sessionId, sendMessage]);

  const triggerAIResponse = async (messageContent: string) => {
    const isAIChat = otherParticipant?.email === 'ai@shipper-chat.local';
    if (!isAIChat) return;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: messageContent,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          (errorBody && (errorBody.error || errorBody.message)) ||
          'AI assistant failed to respond';
        throw new Error(errorMessage);
      }

      const payload = await response.json();
      if (payload?.aiMessage) {
        const aiMsg = payload.aiMessage;
        const aiMessage: Message = {
          id: aiMsg.id,
          content: aiMsg.content,
          senderId: aiMsg.senderId,
          sender: {
            id: aiMsg.sender?.id ?? aiMsg.senderId,
            name: aiMsg.sender?.name || 'AI Assistant',
            picture: aiMsg.sender?.picture || null,
          },
          createdAt: aiMsg.createdAt,
          isRead: false,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('AI response error:', error);
      setError(error instanceof Error ? error.message : 'AI assistant failed to respond');
    }
  };

  // Handle sending message
  const handleSend = async (content: string) => {
    if (!isConnected || !sendMessage) {
      setError('Connection lost. Please wait...');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const optimisticMessage: Message = {
        id: `pending-${Date.now()}`,
        content,
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: 'You',
          picture: null,
        },
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      sendMessage({
        type: 'MESSAGE_SENT',
        payload: {
          sessionId,
          content,
          senderId: currentUserId,
        },
        timestamp: Date.now(),
      });

      void triggerAIResponse(content);

      // We don't add the message to the list here manually anymore.
      // We wait for the MESSAGE_RECEIVED event from the server to ensure consistency.
      // This also prevents duplicates.

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const displayName = otherParticipant?.name || 'User';
  const displayImage = otherParticipant?.picture || '/placeholder-avatar.png';

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0b1224] to-[#030611] text-slate-100 relative overflow-hidden border border-white/5 shadow-[0_30px_60px_rgba(2,6,23,0.7)]">
      {/* Header */}
      {otherParticipant && (
        <header className="relative z-10 border-b border-white/10 bg-[#0c1326]/80 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 cursor-pointer transition-transform hover:scale-105">
              <div className="h-11 w-11 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10">
                {displayImage && displayImage !== '/placeholder-avatar.png' ? (
                  <Image
                    src={displayImage}
                    alt={displayName}
                    width={44}
                    height={44}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#38bdf8] to-[#a855f7] text-[15px] text-white font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {otherParticipant.isOnline && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-green-500 dark:border-zinc-900 shadow-sm" />
              )}
            </div>
            <div className="min-w-0 flex-1 cursor-pointer">
              <h2 className="font-semibold text-white leading-tight text-[15px]">
                {displayName}
              </h2>
              {/* Show typing indicator or online status */}
              {typingUsers.size > 0 ? (
                <p className="text-[13px] text-[#38bdf8] leading-tight font-medium">
                  typing...
                </p>
              ) : (
                <p className="text-[13px] text-slate-400 leading-tight">
                  {otherParticipant.isOnline ? (
                    <span className="text-[#34d399] font-medium">Online</span>
                  ) : (
                    'Last seen recently'
                  )}
                </p>
              )}
            </div>
            {!isConnected && (
              <div className="flex items-center gap-2 rounded-full bg-[#fef08a]/15 px-3 py-1.5 text-xs font-medium text-[#facc15] backdrop-blur-sm">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#fde047]" />
                Reconnecting
              </div>
            )}
          </div>
        </header>
      )}

      {/* Messages */}
      {error && (
        <div className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        sessionId={sessionId}
        disabled={sending}
        placeholder={!isConnected ? 'Connecting...' : 'Type a message...'}
      />
    </div>
  );
}

