import { NextResponse } from 'next/server';

export async function GET(request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('rmxyz_session', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
