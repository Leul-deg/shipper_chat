'use client';

export default function LogoBadge() {
  return (
    <div className="relative h-10 w-10 rounded-3xl bg-gradient-to-br from-[#38bdf8] via-[#7c3aed] to-[#a855f7] p-[2px] shadow-[0_20px_60px_rgba(15,23,42,0.8)]">
      <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-[#070c1a]">
        <svg
          viewBox="0 0 36 36"
          role="img"
          className="h-[70%] w-[70%] text-white"
        >
          <path
            d="M10 12c2.5-3 5.5-3 8.5-2s4 3 2.5 5.5c-1.5 2.6-4 2.9-6.5 4.5s-2 4-1 6"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M15 22c2.5 3 5.5 3 8.5 2s4-3 2.5-5.5c-1.5-2.6-4-2.9-6.5-4.5s-2-4-1-6"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}

