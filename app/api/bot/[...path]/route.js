import { NextResponse } from 'next/server';
import { readSession } from '../../../../lib/auth';

export async function GET(request, context) { return proxy(request, context, 'GET'); }
export async function POST(request, context) { return proxy(request, context, 'POST'); }
export async function PATCH(request, context) { return proxy(request, context, 'PATCH'); }

async function proxy(request, context, method) {
  const session = await readSession(request.cookies.get('rmxyz_session')?.value);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const params = await context.params;
  const parts = params.path || [];
  const path = parts.join('/');
  if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 });

  const guildMatch = path.match(/^guild\/(\d+)(?:\/|$)/);
  if (guildMatch) {
    const allowed = (session.guilds || []).some((guild) => guild.id === guildMatch[1]);
    if (!allowed) return NextResponse.json({ error: 'You do not have dashboard access to this server.' }, { status: 403 });
  }

  const base = process.env.BOT_API_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!base || !secret) return NextResponse.json({ error: 'Bot bridge is not configured on Vercel.' }, { status: 503 });
  const init = { method, headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' };
  if (method !== 'GET') {
    init.headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
    init.body = await request.text();
  }
  const upstream = await fetch(`${base.replace(/\/$/, '')}/${path}`, init);
  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' } });
}
