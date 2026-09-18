import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

const client = new OAuth2Client(env.googleClientId);

/**
 * Verifies a Google Identity Services ID token and enforces the workspace
 * domain restriction. Throws on any invalid/untrusted/disallowed token.
 */
export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();

  if (!payload || !payload.email_verified) {
    throw new Error('Google email not verified');
  }

  if (env.googleAllowedDomain) {
    const emailDomain = payload.email.split('@')[1]?.toLowerCase();
    const hd = payload.hd?.toLowerCase();
    const allowed = env.googleAllowedDomain.toLowerCase();
    if (hd !== allowed && emailDomain !== allowed) {
      throw new Error(`Account domain not allowed: ${payload.email}`);
    }
  }

  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null,
  };
}
