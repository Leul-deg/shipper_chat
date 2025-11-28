'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WebSocketMessage } from '@/types/websocket';
import UserListItem from './UserListItem';

interface User {
  id: string;
  name: string;
  email: string | null;
  picture: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

interface UserListProps {
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

export default function UserList({ onUserClick, currentUserId }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Set up WebSocket connection for real-time updates
  const { isConnected, subscribe } = useWebSocket({
    onOpen: () => {
      console.log('WebSocket connected');
    },
    onClose: () => {
      console.log('WebSocket disconnected');
    },
  });

  // Subscribe to user status updates
  useEffect(() => {
    const unsubscribe = subscribe((message: WebSocketMessage) => {
      if (message.type === 'USER_ONLINE' || message.type === 'USER_OFFLINE') {
        const { userId, isOnline, lastSeen } = message.payload;
        
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  isOnline,
                  lastSeen: lastSeen || user.lastSeen,
                }
              : user
          )
        );
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 dark:text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchUsers}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Users
          </h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {users.map((user) => (
          <UserListItem key={user.id} user={user} onClick={onUserClick} />
        ))}
      </div>
    </div>
  );
}

