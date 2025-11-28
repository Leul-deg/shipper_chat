'use client';

import { signIn } from '@/lib/auth-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Welcome to Shipper Chat
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Sign in to start chatting
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error === 'Configuration' && 'There is a problem with the server configuration.'}
            {error === 'AccessDenied' && 'You do not have permission to sign in.'}
            {error === 'Verification' && 'The verification token has expired or has already been used.'}
            {error === 'OAuthSignin' && (
              <div>
                <p className="font-semibold">OAuth Sign-in Error</p>
                <p className="text-sm mt-1">
                  Please ensure you're accessing the app via <strong>localhost:3000</strong> (not 127.0.0.1:3000).
                  Also verify that the redirect URI in Google Console matches exactly: <code className="text-xs">http://localhost:3000/api/auth/callback/google</code>
                </p>
              </div>
            )}
            {error === 'OAuthCallback' && (
              <div>
                <p className="font-semibold">OAuth Callback Error</p>
                <p className="text-sm mt-1">
                  There was an error processing the OAuth callback. This might be due to:
                </p>
                <ul className="text-sm mt-2 list-disc list-inside space-y-1">
                  <li>Database connection issues - check your DATABASE_URL</li>
                  <li>User creation failed - verify Prisma migrations are applied</li>
                  <li>Network timeout - try again in a moment</li>
                </ul>
                <p className="text-sm mt-2">Check the server logs for more details.</p>
              </div>
            )}
            {!['Configuration', 'AccessDenied', 'Verification', 'OAuthSignin', 'OAuthCallback'].includes(error) && 'An error occurred during sign in.'}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isLoading ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing in...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

