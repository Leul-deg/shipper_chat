'use client';

interface AIInfoCardProps {
  onStartAIChat: () => void;
  isLoading: boolean;
  error?: string | null;
}

export default function AIInfoCard({
  onStartAIChat,
  isLoading,
  error,
}: AIInfoCardProps) {
  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0f172a]/80 p-5 text-white shadow-[0_20px_40px_rgba(2,6,23,0.55)]">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-[#38bdf8] to-[#a855f7] flex items-center justify-center text-xl font-semibold">
          AI
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-[0.5em] text-slate-500">
            Chat AI
          </p>
          <p className="text-lg font-semibold text-white">Ask AI</p>
        </div>
      </div>
      <p className="text-sm text-slate-300">
        Get instant answers, summaries, or help composing a message without leaving this space.
      </p>
      <button
        className="w-full rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 disabled:border-white/10 disabled:text-slate-400"
        disabled={isLoading}
        onClick={onStartAIChat}
      >
        {isLoading ? 'Starting...' : 'Open AI chat'}
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

