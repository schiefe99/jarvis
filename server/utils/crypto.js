const crypto = require('crypto');

const ALGO = 'aes-256-cbc';

// Derive a fixed 32-byte key from the secret phrase
const KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'jarvis_finance_key_change_me',
  'jarvis_finance_salt_v1',
  32
);

function encrypt(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored) {
  // Handle legacy plain numbers (if any rows pre-date encryption)
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) {
    return parseFloat(stored) || 0;
  }
  try {
    const [ivHex, dataHex] = stored.split(':');
    const iv   = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return parseFloat(plain.toString('utf8'));
  } catch {
    return parseFloat(stored) || 0;
  }
}

module.exports = { encrypt, decrypt };
