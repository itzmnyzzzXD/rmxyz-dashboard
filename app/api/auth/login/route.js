import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirect = process.env.DISCORD_REDIRECT_URI || 'https://rmxyz-dashboard.vercel.app/api/auth/callback';
  if (!clientId) return NextResponse.json({ error: 'DISCORD_CLIENT_ID is not configured' }, { status: 500 });
  const state = crypto.randomUUID();
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return response;
}
