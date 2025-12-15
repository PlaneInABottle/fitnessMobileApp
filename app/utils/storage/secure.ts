import { MMKV } from "react-native-mmkv"

import { loadString as loadPlainString, saveString as savePlainString } from "."

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string") {
    const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    if (iso8601.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return date
    }
  }
  return value
}

const ENCRYPTION_KEY_STORAGE_KEY = "MMKV_SECURE_ENCRYPTION_KEY"

function generateEncryptionKey16(): string {
  // MMKV requires <= 16 bytes. Keep it ASCII to avoid multi-byte surprises.
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  const cryptoObj = (globalThis as any)?.crypto
  const useCrypto = cryptoObj && typeof cryptoObj.getRandomValues === "function"

  const bytes = new Uint8Array(16)
  if (useCrypto) {
    cryptoObj.getRandomValues(bytes)
  } else {
    throw new Error("Secure random generation not available. crypto.getRandomValues is required.")
  }

  let key = ""
  for (let i = 0; i < bytes.length; i++) key += alphabet[bytes[i] % alphabet.length]
  return key
}

function getOrCreateEncryptionKey(): string {
  const existing = loadPlainString(ENCRYPTION_KEY_STORAGE_KEY)
  if (existing && existing.length === 16) return existing

  // NOTE: This is a temporary approach. Replace with Keychain/Keystore storage.
  const generated = generateEncryptionKey16()
  savePlainString(ENCRYPTION_KEY_STORAGE_KEY, generated)
  return generated
}

const isTest = typeof process !== "undefined" && !!process.env.JEST_WORKER_ID
const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : false

let secureStorage: MMKV | null = null

try {
  secureStorage = new MMKV({ id: "secure", encryptionKey: getOrCreateEncryptionKey() })
} catch {
  // Encryption is not supported on Web/Jest; only fall back in dev/test.
  if (isTest || isDev) {
    try {
      secureStorage = new MMKV({ id: "secure" })
    } catch {
      secureStorage = null
    }
  }
}

export function loadString(key: string): string | null {
  try {
    return secureStorage?.getString(key) ?? null
  } catch {
    return null
  }
}

export function saveString(key: string, value: string): boolean {
  if (!secureStorage) return false
  try {
    secureStorage.set(key, value)
    return true
  } catch {
    return false
  }
}

export function load<T>(key: string): T | null {
  const str = loadString(key)
  if (str == null) return null

  try {
    return JSON.parse(str, dateReviver) as T
  } catch {
    return null
  }
}

export function save(key: string, value: unknown): boolean {
  if (!secureStorage) return false
  return saveString(key, JSON.stringify(value))
}

export function remove(key: string): void {
  try {
    secureStorage?.delete(key)
  } catch {}
}

export function clear(): void {
  try {
    secureStorage?.clearAll()
  } catch {}
}
