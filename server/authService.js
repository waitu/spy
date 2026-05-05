import crypto from 'crypto';
import { query } from './db.js';

const AUTH_SECRET = process.env.AUTH_TOKEN_SECRET ?? 'daily-spoon-dev-secret';
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 24 * 7);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createDisplayNameFromEmail(email) {
  const localPart = String(email ?? '').trim().toLowerCase().split('@')[0] ?? 'editor';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Editor';
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  const [salt, storedHash] = String(storedValue ?? '').split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computedHash, 'hex'));
}

function createTokenSignature(encodedPayload) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
}

export function issueAuthToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createTokenSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  const [encodedPayload, signature] = String(token ?? '').split('.');
  if (!encodedPayload || !signature) {
    throw createHttpError(401, 'Invalid token');
  }

  const expectedSignature = createTokenSignature(encodedPayload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw createHttpError(401, 'Invalid token');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload.exp || payload.exp < Date.now()) {
    throw createHttpError(401, 'Session expired');
  }

  return payload;
}

export function sanitizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

function validateCredentials({ name, email, password }, { includeName = false } = {}) {
  if (includeName && !String(name ?? '').trim()) {
    throw createHttpError(400, 'Name is required');
  }

  if (!String(email ?? '').trim()) {
    throw createHttpError(400, 'Email is required');
  }

  if (!String(password ?? '').trim()) {
    throw createHttpError(400, 'Password is required');
  }

  if (String(password).length < 8) {
    throw createHttpError(400, 'Password must be at least 8 characters');
  }
}

export async function getUserById(userId) {
  const result = await query(
    `select id, name, email, role, created_at
     from users
     where id = $1`,
    [userId]
  );

  return sanitizeUser(result.rows[0] ?? null);
}

export async function createUser({ name, email, password }) {
  validateCredentials({ name, email, password });

  const normalizedEmail = String(email).trim().toLowerCase();
  const resolvedName = String(name ?? '').trim() || createDisplayNameFromEmail(normalizedEmail);

  try {
    const result = await query(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, 'editor')
       returning id, name, email, role, created_at`,
      [resolvedName, normalizedEmail, hashPassword(password)]
    );

    return sanitizeUser(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw createHttpError(409, 'Email already exists');
    }

    throw error;
  }
}

export async function authenticateUser({ email, password }) {
  validateCredentials({ email, password });

  const result = await query(
    `select id, name, email, role, password_hash, created_at
     from users
     where email = $1`,
    [String(email).trim().toLowerCase()]
  );

  const row = result.rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw createHttpError(401, 'Invalid email or password');
  }

  return sanitizeUser(row);
}

export function buildAuthPayload(user) {
  return {
    token: issueAuthToken(user),
    user,
  };
}

export function getBearerToken(authorizationHeader) {
  const [scheme, token] = String(authorizationHeader ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export { createHttpError };
