# Security and Encryption Best Practices

This document details the security measures and encryption patterns used for storage in the Fitness Tracker App.

## MMKV Encryption

We use MMKV's built-in encryption to protect data at rest.

### Encryption Key Management
1. **Generation**: A unique UUID is generated using `expo-crypto` the first time the app is launched.
2. **Storage**: The key is stored in Expo SecureStore, which uses the device's native Keychain (iOS) or Keystore (Android).
3. **Retrieval**: MMKV retrieves this key during initialization to decrypt the storage file.

## SecureStore Limitations

Expo SecureStore is ideal for small pieces of data (keys, tokens) but has size limits (usually 2KB). NEVER store large datasets directly in SecureStore. Instead, use SecureStore to hold the encryption key for a larger, encrypted database (like MMKV).

## Handling Sensitive Data

1. **Tokens**: Auth tokens should always be stored in an encrypted instance.
2. **Personal Information**: PII (Personally Identifiable Information) like email or names should be encrypted.
3. **Debug Logs**: NEVER log sensitive data or encryption keys to the console in production.

## Troubleshooting Encryption

### Key Retrieval Fails
If `SecureStore.getItem` fails, the app will fallback to unencrypted storage (not ideal). Monitor logs for "Critical: Failed to manage encryption key" to detect these issues.

### Corrupted Storage
If the encryption key is lost (e.g., SecureStore is cleared), the MMKV instance will be inaccessible. In such cases, `storage.clearAll()` or deleting the app data may be the only resolution.

## Best Practices

1. **Separate Instances**: Consider using a separate MMKV instance for highly sensitive data vs. cached images or UI state.
2. **Periodic Rotation**: While complex, periodic rotation of encryption keys is a high-security practice.
3. **Cleanup**: Clear sensitive storage on user logout.
