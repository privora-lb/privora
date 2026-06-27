import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = (await scrypt(password, salt, keyLength)) as Buffer;

  return `${salt}:${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hash = (await scrypt(password, salt, keyLength)) as Buffer;
  const stored = Buffer.from(storedHash, "base64url");

  return hash.length === stored.length && crypto.timingSafeEqual(hash, stored);
}
