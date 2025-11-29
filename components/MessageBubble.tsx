'use client';

import Image from 'next/image';
// Simple date formatting without external dependency
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

export default function MessageBubble({
  message,
  isOwn,
  showAvatar = false,
  showName = false,
}: MessageBubbleProps) {
  const displayName = message.sender.name || 'User';
  const displayImage = message.sender.picture || '/placeholder-avatar.png';
  const time = formatTime(message.createdAt);

  return (
    <div
      className={`flex w-full gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'items-end' : 'items-end'} mb-1`}
    >
      {/* Avatar (only for others) */}
      {!isOwn && (
        <div className={`flex-shrink-0 w-8 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-white/10">
            {displayImage && displayImage !== '/placeholder-avatar.png' ? (
              <Image
                src={displayImage}
                alt={displayName}
                width={32}
                height={32}
                className="object-cover"
                unoptimized
              />
            ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#38bdf8] to-[#a855f7] text-xs text-white font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`relative w-fit max-w-[75%] md:max-w-[60%] px-4 py-3 ${isOwn
          ? 'bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-white rounded-[20px] rounded-br-lg shadow-[0_24px_70px_rgba(15,118,255,0.45)]'
          : 'bg-[#111c33] text-slate-100 rounded-[20px] rounded-bl-lg border border-white/5'
        }`}
      >
        {/* Name (only for others in groups, but we show if requested) */}
        {showName && !isOwn && (
          <div className="mb-1 text-xs font-semibold text-[#38bdf8]">
            {displayName}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-2">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-white/90">
            {message.content}
          </p>

          {/* Timestamp & Status */}
          <div className="flex items-center gap-1 select-none ml-auto h-4">
            <span className={`text-[11px] ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
              {time}
            </span>
            {isOwn && (
              <span className={`text-[11px] ${message.isRead ? 'text-white/90' : 'text-white/70'}`}>
                {message.isRead ? (
                  // Double checkmark
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L7 17l-5-5" />
                    <path d="m22 10-7.5 7.5L13 16" />
                  </svg>
                ) : (
                  // Single checkmark
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
