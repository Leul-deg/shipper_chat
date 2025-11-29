'use client';

import Image from 'next/image';

interface ProfileDropdownProps {
    user: {
        name: string;
        email: string;
        picture?: string | null;
        image?: string | null;
    };
    onSignOut: () => void;
}

export default function ProfileDropdown({ user, onSignOut }: ProfileDropdownProps) {
    const avatarSrc = user.picture || user.image || null;
    return (
        <div className="flex flex-shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f172a]/80 px-4 py-2 text-white shadow-[0_20px_50px_rgba(2,6,23,0.55)]">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-transparent">
                {avatarSrc ? (
                    <Image
                        src={avatarSrc}
                        alt={user.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#38bdf8] to-[#a855f7] text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                                    </div>
            <div className="flex flex-col min-w-0">
                <p className="font-semibold text-white text-[15px] truncate">{user.name}</p>
                <p className="text-[12px] text-slate-400 truncate">{user.email}</p>
                    </div>
                        <button
                onClick={onSignOut}
                className="rounded-full border border-white/30 px-3 py-1 text-[12px] font-semibold tracking-wide uppercase text-white transition hover:border-white/60"
                        >
                            Sign Out
                        </button>
        </div>
    );
}
