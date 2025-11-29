'use client';

import { WebSocketProvider } from '@/components/providers/WebSocketProvider';

export default function ChatsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <WebSocketProvider>{children}</WebSocketProvider>;
}
