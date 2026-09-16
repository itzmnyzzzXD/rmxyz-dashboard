import { NextResponse } from 'next/server';
import { createSession } from '../../../../lib/auth';

const api = 'https://discord.com/api/v10';
const fallbackRedirect = 'https://rmxyz-dashboard.vercel.app/api/auth/callback';

function errorRedirect(request, message) {
  const url = new URL('/', request.url);
  url.searchParams.set('auth_error', message);
  return NextResponse.redirect(url);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const savedState = request.cookies.get('oauth_state')?.value;

    if (!code) return errorRedirect(request, 'Discord did not return an authorization code.');
    if (!state || !savedState || state !== savedState) return errorRedirect(request, 'OAuth state verification failed. Please try logging in again.');

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirect = process.env.DISCORD_REDIRECT_URI || fallbackRedirect;

    if (!clientId || !clientSecret) return errorRedirect(request, 'Discord OAuth is not configured on the dashboard.');
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return errorRedirect(request, 'SESSION_SECRET is missing or too short in Vercel.');

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    });

    const tokenResponse = await fetch(`${api}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text().catch(() => '');
      console.error('Discord token exchange failed:', tokenResponse.status, details);
      return errorRedirect(request, 'Discord rejected the OAuth callback. Check the redirect URI and client secret.');
    }

    const token = await tokenResponse.json();
    if (!token.access_token) return errorRedirect(request, 'Discord did not return an access token.');

    const headers = { Authorization: `Bearer ${token.access_token}` };
    const [userResponse, guildResponse] = await Promise.all([
      fetch(`${api}/users/@me`, { headers, cache: 'no-store' }),
      fetch(`${api}/users/@me/guilds`, { headers, cache: 'no-store' }),
    ]);

    if (!userResponse.ok || !guildResponse.ok) {
      console.error('Discord account lookup failed:', userResponse.status, guildResponse.status);
      return errorRedirect(request, 'Discord account lookup failed. Please try again.');
    }

    const user = await userResponse.json();
    const allGuilds = await guildResponse.json();

    // 0x8 = Administrator, 0x20 = Manage Server.
    // Discord returns the user's effective server permissions in the OAuth guild list.
    const guilds = allGuilds
      .filter((g) => g.owner || ((Number(g.permissions) & 0x8) === 0x8) || ((Number(g.permissions) & 0x20) === 0x20))
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=96` : null,
        owner: !!g.owner,
        administrator: ((Number(g.permissions) & 0x8) === 0x8),
        manageGuild: ((Number(g.permissions) & 0x20) === 0x20),
        permissions: g.permissions,
      }))
      .sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name));

    const session = await createSession({
      user: {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=96`
          : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`,
      },
      guilds,
      access_token: token.access_token,
    });

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('rmxyz_session', session, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    });
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return errorRedirect(request, 'The dashboard could not finish Discord login. Check your Vercel environment variables.');
  }
}
