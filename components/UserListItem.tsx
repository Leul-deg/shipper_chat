'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string | null;
  picture: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

interface UserListItemProps {
  user: User;
  onClick?: (user: User) => void;
}

export default function UserListItem({ user, onClick }: UserListItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick(user);
    } else {
      // Default: navigate to start chat
      router.push(`/chat/new?userId=${user.id}`);
    }
  };

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const displayImage = user.picture || '/placeholder-avatar.png';

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          {displayImage && displayImage !== '/placeholder-avatar.png' ? (
            <Image
              src={displayImage}
              alt={displayName}
              width={48}
              height={48}
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Online status indicator */}
        {user.isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-zinc-900" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-black dark:text-white">{displayName}</p>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {user.isOnline ? (
            <span className="text-green-600 dark:text-green-400">Online</span>
          ) : user.lastSeen ? (
            `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`
          ) : (
            'Offline'
          )}
        </p>
      </div>
    </button>
  );
}

