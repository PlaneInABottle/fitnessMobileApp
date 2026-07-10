import { MMKV } from "react-native-mmkv"

export const storage = new MMKV()

const LEGACY_SECURE_STORAGE_ID = "secure"
const LEGACY_ENCRYPTION_KEY_STORAGE_KEY = "MMKV_SECURE_ENCRYPTION_KEY"

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

function openLegacySecureStorage(): MMKV | null {
  const encryptionKey = loadString(LEGACY_ENCRYPTION_KEY_STORAGE_KEY)
  if (!encryptionKey || encryptionKey.length !== 16) return null

  try {
    return new MMKV({ id: LEGACY_SECURE_STORAGE_ID, encryptionKey })
  } catch {
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  try {
    const almostThere = loadString(key)
    if (!almostThere) return null
    return JSON.parse(almostThere) as T
  } catch {
    return null
  }
}

export function loadLegacySecure<T>(key: string): T | null {
  try {
    const serializedValue = openLegacySecureStorage()?.getString(key)
    return serializedValue ? (JSON.parse(serializedValue) as T) : null
  } catch {
    return null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.delete(key)
  } catch {}
}

export function removeLegacySecure(key: string): void {
  try {
    openLegacySecureStorage()?.delete(key)
    storage.delete(LEGACY_ENCRYPTION_KEY_STORAGE_KEY)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}
