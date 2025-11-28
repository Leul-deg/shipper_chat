import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Check if Gemini is configured
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Gemini not available:', error);
    return null;
  }
};

// POST: Send message to AI and get response
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    // Verify session exists and user is participant
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const isParticipant = chatSession.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if this is an AI session (has AI user as participant)
    // For now, we'll check if session has a special AI user
    // In a real implementation, you'd create an AI user in the database
    const genAI = getGeminiClient();
    if (!genAI) {
      return NextResponse.json(
        { error: 'AI chat is not configured. Please set GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    // Get conversation history for context
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 20, // Last 20 messages for context
    });

    // Format messages for Gemini (Gemini uses a different format)
    // Build conversation history for context
    const conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    messages.forEach((msg) => {
      const role = msg.senderId === session.user.id ? 'user' : 'model';
      conversationHistory.push({
        role,
        parts: [{ text: msg.content }],
      });
    });

    // Get Gemini model (using gemini-pro which is free)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
      systemInstruction: 'You are a helpful and friendly AI assistant in a chat application. Keep responses concise and conversational.',
    });

    // Start a chat session with history (if any)
    const chat = conversationHistory.length > 0
      ? model.startChat({ history: conversationHistory })
      : model.startChat();

    // Send the current message and get response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const aiResponse = response.text() || 'Sorry, I could not generate a response.';

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        content: message.trim(),
        senderId: session.user.id,
        sessionId,
      },
    });

    let aiUserId = process.env.AI_USER_ID;
    let aiUser = aiUserId
      ? await prisma.user.findUnique({ where: { id: aiUserId } })
      : null;

    if (!aiUser) {
      aiUser = await prisma.user.findFirst({
        where: { email: 'ai@shipper-chat.local' },
      });
    }

    if (!aiUser) {
      aiUser = await prisma.user.create({
        data: {
          email: 'ai@shipper-chat.local',
          name: 'AI Assistant',
          picture: null,
          isOnline: true,
        },
      });
    }

    aiUserId = aiUser.id;

    const aiMessage = await prisma.chatMessage.create({
      data: {
        content: aiResponse,
        senderId: aiUserId,
        sessionId,
        isRead: false,
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Broadcast AI message via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      await wsManager.broadcastMessageToSession(
        sessionId,
        {
          type: 'MESSAGE_RECEIVED',
          payload: {
            messageId: aiMessage.id,
            sessionId: aiMessage.sessionId,
            senderId: aiMessage.senderId,
            content: aiMessage.content,
            createdAt: aiMessage.createdAt.toISOString(),
          },
          timestamp: Date.now(),
        }
      );
    } else {
      console.warn('WebSocket manager not initialized; skipping AI broadcast.');
    }

    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        senderId: userMessage.senderId,
        sessionId: userMessage.sessionId,
        createdAt: userMessage.createdAt.toISOString(),
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiMessage.content,
        sender: {
          id: aiUser.id,
          name: aiUser.name,
          email: aiUser.email,
          picture: aiUser.picture || aiUser.image || null,
        },
        senderId: aiMessage.senderId,
        sessionId: aiMessage.sessionId,
        createdAt: aiMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { error: 'Failed to process AI chat request' },
      { status: 500 }
    );
  }
}

