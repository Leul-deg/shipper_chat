'use client';

const AI_USER_PLACEHOLDER = 'ai-user-placeholder';

export interface AIChatSession {
  id: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  otherParticipant: {
    id: string;
    name: string;
    email: string;
    picture: string | null;
    isOnline: boolean;
  } | null;
}

export async function startAIChatSession(): Promise<AIChatSession> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: AI_USER_PLACEHOLDER,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      (errorBody && (errorBody.error || errorBody.message)) ||
      'Failed to start AI chat session';
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.session) {
    throw new Error('AI chat session response was malformed');
  }

  return data.session;
}

