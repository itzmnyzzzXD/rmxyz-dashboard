import { NextResponse } from 'next/server';
import { createSession } from '../../../../lib/auth';

const api = 'https://discord.com/api/v10';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = request.cookies.get('oauth_state')?.value;
  if (!code || !state || !savedState || state !== savedState) return NextResponse.json({ error: 'Invalid OAuth state.' }, { status: 400 });

  const redirect = process.env.DISCORD_REDIRECT_URI || 'https://rmxyz-dashboard.vercel.app/api/auth/callback';
  const body = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirect });
  const tokenResponse = await fetch(`${api}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  if (!tokenResponse.ok) return NextResponse.json({ error: 'Discord token exchange failed.' }, { status: 502 });
  const token = await tokenResponse.json();

  const headers = { Authorization: `Bearer ${token.access_token}` };
  const [userResponse, guildResponse] = await Promise.all([
    fetch(`${api}/users/@me`, { headers, cache: 'no-store' }),
    fetch(`${api}/users/@me/guilds`, { headers, cache: 'no-store' }),
  ]);
  if (!userResponse.ok || !guildResponse.ok) return NextResponse.json({ error: 'Discord account lookup failed.' }, { status: 502 });
  const user = await userResponse.json();
  const allGuilds = await guildResponse.json();
  const guilds = allGuilds.filter((g) => ((Number(g.permissions) & 0x20) === 0x20) || ((Number(g.permissions) & 0x8) === 0x8)).map((g) => ({
    id: g.id, name: g.name, icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=96` : null,
    owner: !!g.owner, permissions: g.permissions,
  }));

  const session = await createSession({ user: { id: user.id, username: user.global_name || user.username, avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=96` : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png` }, guilds, access_token: token.access_token });
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('rmxyz_session', session, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 604800, path: '/' });
  response.cookies.set('oauth_state', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
