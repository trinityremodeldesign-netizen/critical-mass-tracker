import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// GET - Fetch all sessions for a session ID
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  try {
    const sessions = await kv.get(`sessions:${sessionId}`) || [];
    
    // Sort by date descending (most recent first)
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    return NextResponse.json({ sessions: sortedSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST - Save a new session
export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, session } = body;

    if (!sessionId || !session) {
      return NextResponse.json({ error: 'Session ID and session data required' }, { status: 400 });
    }

    // Get existing sessions
    const existingSessions = await kv.get(`sessions:${sessionId}`) || [];

    // Add new session
    const updatedSessions = [session, ...existingSessions];

    // Save back to KV
    await kv.set(`sessions:${sessionId}`, updatedSessions);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json({ 
      error: 'Failed to save session', 
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a specific session
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const workoutSessionId = searchParams.get('workoutSessionId');

    if (!sessionId || !workoutSessionId) {
      return NextResponse.json({ error: 'Session ID and workout session ID required' }, { status: 400 });
    }

    // Get existing sessions
    const existingSessions = await kv.get(`sessions:${sessionId}`) || [];

    // Filter out the deleted session
    const updatedSessions = existingSessions.filter(s => s.id !== workoutSessionId);

    // Save back to KV
    await kv.set(`sessions:${sessionId}`, updatedSessions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

// PUT - Update an existing session
export async function PUT(request) {
  try {
    const body = await request.json();
    const { sessionId, session } = body;

    if (!sessionId || !session || !session.id) {
      return NextResponse.json({ error: 'Session ID and session data required' }, { status: 400 });
    }

    // Get existing sessions
    const existingSessions = await kv.get(`sessions:${sessionId}`) || [];

    // Find and update the session
    const updatedSessions = existingSessions.map(s => 
      s.id === session.id ? { ...session, updatedAt: new Date().toISOString() } : s
    );

    // Check if session was found
    const sessionFound = existingSessions.some(s => s.id === session.id);
    if (!sessionFound) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Save back to KV
    await kv.set(`sessions:${sessionId}`, updatedSessions);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ 
      error: 'Failed to update session', 
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
