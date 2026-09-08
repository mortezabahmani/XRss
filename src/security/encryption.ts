export async function deriveKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey.padEnd(32, '0').substring(0, 32));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecret(plainText: string, masterKey: string): Promise<string> {
  if (!plainText || !plainText.trim()) return '';
  if (plainText.startsWith('enc:v1:')) return plainText; // Already encrypted

  const key = await deriveKey(masterKey || 'xrss-default-master-key');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `enc:v1:${ivHex}:${cipherHex}`;
}

export async function decryptSecret(cipherText: string, masterKey: string): Promise<string> {
  if (!cipherText || !cipherText.trim()) return '';
  if (!cipherText.startsWith('enc:v1:')) return cipherText; // Plaintext legacy value

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return cipherText;
    const ivHex = parts[2];
    const cipherHex = parts[3];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const cipherBuffer = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);

    const key = await deriveKey(masterKey || 'xrss-default-master-key');
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Failed to decrypt secret:', err);
    return '';
  }
}
