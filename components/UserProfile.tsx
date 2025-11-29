import Image from 'next/image';

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  picture?: string | null;
}

interface UserProfileProps {
  user: User;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserProfile({ user, showName = true, size = 'md', className = '' }: UserProfileProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  const imageSize = {
    sm: 32,
    md: 40,
    lg: 64,
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayImage = user?.image || user?.picture || '/placeholder-avatar.png';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${sizeClasses[size]} flex-shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700`}>
        {displayImage && displayImage !== '/placeholder-avatar.png' ? (
          <Image
            src={displayImage}
            alt={displayName}
            width={imageSize[size]}
            height={imageSize[size]}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {showName && (
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-black dark:text-white">{displayName}</p>
          {user?.email && (
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
          )}
        </div>
      )}
    </div>
  );
}

