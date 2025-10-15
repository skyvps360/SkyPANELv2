import crypto from 'crypto';
import { config } from '../config/index.js';

interface EncryptedPayload {
  iv: string; // base64
  tag: string; // base64
  ciphertext: string; // base64
}

function getKey(): Buffer {
  const raw = config.SSH_CRED_SECRET || '';
  if (!raw || raw.length < 16) {
    console.warn('SSH_CRED_SECRET not set or too short; falling back to insecure dev key. Set SSH_CRED_SECRET in .env to a strong 32-byte value.');
    // Derive a deterministic dev key from JWT_SECRET to avoid total failure locally
    const seed = (config.JWT_SECRET || 'containerstacks-dev-secret').padEnd(32, '0');
    return crypto.createHash('sha256').update(seed).digest();
  }
  // Normalize to 32 bytes via SHA-256
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM recommended IV size
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncryptedPayload = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decryptSecret(encoded: string): string {
  const key = getKey();
  const json = Buffer.from(encoded, 'base64').toString('utf8');
  const payload = JSON.parse(json) as EncryptedPayload;
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return plaintext;
}

export function hasEncryptionKey(): boolean {
  const raw = config.SSH_CRED_SECRET || '';
  return raw.length >= 16; // heuristic
}