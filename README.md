# Shipper Chat - Real-time Chat Application

A full-featured real-time chat application built with Next.js, WebSocket, Prisma, and Supabase. Features Google OAuth authentication, real-time messaging, online/offline status, and AI chat integration with Google Gemini (free tier).

## Features

### Core Features
- ✅ **Google OAuth Authentication** - Sign in with Google account
- ✅ **User Management** - View all users with online/offline status
- ✅ **Real-time Messaging** - WebSocket-based instant messaging
- ✅ **Chat Sessions** - Persistent chat sessions between users
- ✅ **Message History** - All messages saved to database
- ✅ **Online/Offline Status** - Real-time user presence indicators

### Bonus Features
- ✅ **AI Chat Integration** - Chat with AI using Google Gemini (free tier)
- ✅ **Typing Indicators** - See when users are typing
- ✅ **Read Receipts** - Message read status tracking
- ✅ **Modern UI** - Beautiful, responsive design with dark mode support

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, WebSocket (ws library)
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Authentication**: Better Auth with Google OAuth
- **Real-time**: WebSocket for bidirectional communication
- **AI**: Google Gemini API (free tier, for AI chat feature)

## Prerequisites

- Node.js 20.9.0 or higher
- Supabase account (free tier available)
- Google OAuth credentials (for authentication)
- Google Gemini API key (free, for AI chat)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. **Create a Supabase Project:**
   - Go to [Supabase](https://supabase.com/)
   - Sign up for a free account
   - Create a new project
   - Wait for the database to be provisioned

2. **Get Database Connection String:**
   - In your Supabase project, go to Settings → Database
   - Copy the "Connection string" under "Connection pooling"
   - Use the format: `postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true`

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Database (from Supabase project settings)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"

# Better Auth Configuration (REQUIRED for OAuth to work)
# BETTER_AUTH_URL must match your application URL exactly (or use NEXTAUTH_URL for compatibility)
BETTER_AUTH_URL="http://localhost:3000"
# BETTER_AUTH_SECRET is critical - used to encrypt OAuth state cookies
# Without this, you'll get "state mismatch" errors during OAuth
# You can also use NEXTAUTH_SECRET for compatibility
BETTER_AUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Google OAuth (for authentication)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Google Gemini API (free tier, for AI chat feature)
GEMINI_API_KEY="your-gemini-api-key"
```

**⚠️ IMPORTANT: Required Environment Variables**

All of these environment variables are **required** for the application to work:

1. **`DATABASE_URL`** - Supabase PostgreSQL connection string
2. **`BETTER_AUTH_URL`** (or `NEXTAUTH_URL`) - Must be set to `http://localhost:3000` for development (or your production URL)
3. **`BETTER_AUTH_SECRET`** (or `NEXTAUTH_SECRET`) - **Critical for OAuth** - Used to encrypt/decrypt OAuth state cookies
   - Without this, you'll get "state mismatch" errors during Google OAuth sign-in
   - Generate with: `openssl rand -base64 32`
4. **`AUTH_GOOGLE_ID`** - Google OAuth Client ID
5. **`AUTH_GOOGLE_SECRET`** - Google OAuth Client Secret
6. **`GEMINI_API_KEY`** - Optional, but required for AI chat feature

**Generate BETTER_AUTH_SECRET (or NEXTAUTH_SECRET):**
```bash
openssl rand -base64 32
```

**Get Google OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Configure the OAuth consent screen if prompted
6. Select "Web application" as the application type
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (Better Auth uses the same callback path)
8. Copy the Client ID and Client Secret to your `.env.local` file

**Get Google Gemini API Key (Free):**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (free tier includes generous usage limits)

### 4. Set Up Database Schema

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables in Supabase
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Run the Development Server

```bash
# Using custom server (with WebSocket support)
npm run dev

# Or using standard Next.js dev server (WebSocket won't work)
npm run dev:next
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
shipper_chat/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth configuration
│   │   ├── users/                 # User API endpoints
│   │   ├── sessions/              # Session API endpoints
│   │   ├── messages/              # Message API endpoints
│   │   ├── ai/                    # AI chat API endpoints
│   │   └── ws/                    # WebSocket endpoint info
│   ├── auth/                      # Authentication pages
│   ├── chat/                      # Chat pages
│   ├── users/                     # Users page
│   └── page.tsx                   # Home page (redirects)
├── components/                     # React components
│   ├── UserList.tsx
│   ├── UserProfile.tsx
│   ├── ChatWindow.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── MessageBubble.tsx
│   ├── SessionList.tsx
│   ├── TypingIndicator.tsx
│   └── AIChatButton.tsx
├── hooks/
│   └── useWebSocket.ts            # WebSocket client hook
├── lib/
│   ├── prisma.ts                   # Prisma client
│   ├── websocket-manager.ts        # WebSocket server manager
│   └── session-utils.ts            # Session utilities
├── types/
│   └── websocket.ts                # WebSocket type definitions
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
└── server.js                       # Custom server with WebSocket support
```

## API Endpoints

### Authentication
- `GET/POST /api/auth/*` - Better Auth endpoints

### Users
- `GET /api/users` - Get all users (excluding current user)

### Sessions
- `GET /api/sessions` - Get all sessions for current user
- `POST /api/sessions` - Create a new chat session
- `GET /api/sessions/[sessionId]` - Get session details
- `DELETE /api/sessions/[sessionId]` - Delete a session

### Messages
- `GET /api/messages?sessionId=...` - Get messages for a session
- `POST /api/messages` - Create a new message
- `PATCH /api/messages/[messageId]` - Mark message as read

### AI Chat
- `POST /api/ai/chat` - Send message to AI and get response

## WebSocket Protocol

The application uses WebSocket for real-time communication. Message types:

- `USER_ONLINE` - User came online
- `USER_OFFLINE` - User went offline
- `MESSAGE_SENT` - Message sent (client to server)
- `MESSAGE_RECEIVED` - Message received (server to client)
- `TYPING_START` - User started typing
- `TYPING_STOP` - User stopped typing
- `PING` / `PONG` - Connection health check

## Development Notes

### WebSocket Server

The application uses a custom server (`server.js`) to support WebSocket connections. The server:
- Handles HTTP requests via Next.js
- Manages WebSocket connections on `/api/ws`
- Authenticates WebSocket connections using Better Auth sessions
- Broadcasts messages to session participants

### Database Schema

The Prisma schema includes:
- `User` - User accounts (with Better Auth integration)
- `Account` - OAuth accounts (Better Auth)
- `Session` - Better Auth sessions
- `ChatSession` - Chat sessions between users
- `SessionParticipant` - Many-to-many relationship
- `ChatMessage` - Individual messages

### AI Chat Feature

The AI chat feature:
- Creates a special AI user in the database
- Uses Google Gemini Pro (free tier) for responses
- Maintains conversation context (last 20 messages)
- Integrates seamlessly with the chat interface
- **Free to use** - Gemini API has generous free tier limits

## Troubleshooting

### WebSocket Connection Issues
- Ensure you're using `npm run dev` (custom server) not `npm run dev:next`
- Check that WebSocket server is running on port 3000
- Verify session authentication is working

### Database Connection Issues
- Verify `DATABASE_URL` is correct (use connection pooling URL from Supabase)
- Ensure Supabase project is active (not paused)
- Check that you're using the correct password from Supabase
- Make sure you're using the connection pooling URL (port 6543)
- Run `npx prisma migrate dev` to apply migrations
- See `SETUP_SUPABASE.md` for detailed Supabase setup

### AI Chat Issues
- Verify `GEMINI_API_KEY` is set correctly
- Check that you have API quota remaining (free tier is generous)
- Ensure you're using the correct API key from Google AI Studio
- Check browser console for error messages

### Authentication Issues

**OAuth State Mismatch Error:**
If you see "state mismatch" errors during Google sign-in:
- **Verify `BETTER_AUTH_SECRET` (or `NEXTAUTH_SECRET`) is set** - This is required for OAuth state cookie encryption
- **Check `BETTER_AUTH_URL` (or `NEXTAUTH_URL`) matches your app URL** - Must be exactly `http://localhost:3000` for dev
- **Regenerate `BETTER_AUTH_SECRET`** if you've changed it: `openssl rand -base64 32`
- **Clear browser cookies** and try again after fixing environment variables
- **Restart the dev server** after changing environment variables

**OAuth Network Connection Error (AggregateError):**
If you see `SIGNIN_OAUTH_ERROR` with `AggregateError` or `internalConnectMultiple`:
- **Check internet connectivity** - Ensure your server can reach Google's OAuth servers
- **Verify firewall/proxy settings** - Outbound HTTPS connections to `accounts.google.com` must be allowed
- **Check DNS resolution** - The `NODE_OPTIONS='--dns-result-order=ipv4first'` in the dev script helps with IPv6/IPv4 issues
- **Test connectivity manually:**
  ```bash
  curl -v https://accounts.google.com
  ```
- **Verify Google OAuth credentials** - Incorrect credentials can cause connection failures
- **Check for VPN/proxy interference** - Disable VPNs or configure proxy settings if needed
- **Increase timeout** - Already set to 30 seconds, but network issues may require more time
- **Restart the dev server** after network changes

**OAuthSignin Error:**
If you see `OAuthSignin` error:
- **Use `localhost:3000` consistently** - Access the app via `http://localhost:3000` (NOT `http://127.0.0.1:3000`)
- **Verify redirect URI in Google Console** - Must match exactly: `http://localhost:3000/api/auth/callback/google`
- **Check `BETTER_AUTH_URL` (or `NEXTAUTH_URL`)** - Must be set to `http://localhost:3000` (not 127.0.0.1)
- **Clear browser cookies** and try again
- **Restart dev server** after changing environment variables

**OAuthCallback Error:**
If you see `OAuthCallback` error (OAuth flow started but callback failed):
- **Check database connection** - Verify `DATABASE_URL` is correct and Supabase is accessible
- **Verify Prisma migrations** - Run `npx prisma migrate dev` to ensure all tables exist
- **Check server logs** - Look for specific error messages about user creation or database operations
- **Verify Prisma Client is generated** - Run `npx prisma generate` if needed
- **Check for database constraints** - Ensure your Prisma schema matches the database structure
- **Try clearing database** - If this is a fresh setup, you may need to reset: `npx prisma migrate reset`

**Other Authentication Issues:**
- Verify Google OAuth credentials (`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`) are correct
- Ensure redirect URI in Google Console matches: `http://localhost:3000/api/auth/callback/google`
- Check that all required environment variables are set in `.env.local`
- **Always use `localhost` instead of `127.0.0.1`** to avoid OAuth redirect mismatches

## Future Enhancements

Potential features to add:
- File/image attachments
- Message search
- Group chats
- Message reactions
- Voice/video calls
- Push notifications
- Message encryption

## License

This project is open source and available for educational purposes.
