import { NextResponse } from 'next/server';
import { readSession } from '../../../lib/auth';

export async function GET(request) {
  const session = await readSession(request.cookies.get('rmxyz_session')?.value);
  if (!session) return NextResponse.json({ user: null, guilds: [] });
  return NextResponse.json({ user: session.user, guilds: session.guilds || [] });
}
