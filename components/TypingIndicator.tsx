'use client';

interface TypingIndicatorProps {
  userName?: string;
}

export default function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
      </div>
      {userName && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {userName} is typing...
        </span>
      )}
    </div>
  );
}

