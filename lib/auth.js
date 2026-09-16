import { EncryptJWT, jwtDecrypt } from 'jose';

const secret = () => {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(raw);
};

export async function createSession(payload) {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .encrypt(secret());
}

export async function readSession(token) {
  if (!token) return null;
  try { return (await jwtDecrypt(token, secret())).payload; } catch { return null; }
}
