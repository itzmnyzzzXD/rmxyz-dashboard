import { NextResponse } from 'next/server';

export async function GET(request) {
  const secret = process.env.BOT_API_SECRET;
  const base = process.env.BOT_API_URL;
  if (!secret || !base) return NextResponse.json({ ok: false, configured: false });
  try {
    const upstream = await fetch(`${base.replace(/\/$/, '')}/health`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ ok: false, status: 'offline' }, { status: 502 });
  }
}
