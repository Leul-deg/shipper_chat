'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  loading?: boolean;
}

export default function MessageList({
  messages,
  currentUserId,
  loading = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#38bdf8]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
            <p className="text-slate-400">No messages yet</p>
            <p className="mt-2 text-sm text-slate-500">
            Start the conversation by sending a message
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 no-scrollbar"
    >
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId;
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const showAvatar =
          !isOwn &&
          (!nextMessage || nextMessage.senderId !== message.senderId);
        const showName =
          !isOwn &&
          (!messages[index - 1] || messages[index - 1].senderId !== message.senderId);

        return (
          <MessageBubble
            key={`${message.id}-${index}`}
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showName={showName}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

