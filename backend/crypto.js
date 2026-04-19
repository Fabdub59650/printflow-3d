/**
 * crypto.js — Chiffrement AES-256-GCM pour les données sensibles (mot de passe SMTP)
 *
 * La clé est stockée dans .env (ENCRYPTION_KEY=<64 hex chars>).
 * Si absente au démarrage, elle est générée et écrite automatiquement.
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const ENV_PATH = path.join(__dirname, '.env');
const ALG      = 'aes-256-gcm';
const KEY_LEN  = 32; // bytes = 256 bits
const IV_LEN   = 12; // bytes, recommandé pour GCM

// ── Charger ou générer la clé ─────────────────────────────────────────────
function loadOrGenerateKey() {
  // 1. Déjà dans l'environnement
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64) {
    return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  // 2. Lire le .env
  let envContent = '';
  try { envContent = fs.readFileSync(ENV_PATH, 'utf8'); } catch(_) {}

  const match = envContent.match(/^ENCRYPTION_KEY=([0-9a-f]{64})$/m);
  if (match) {
    process.env.ENCRYPTION_KEY = match[1];
    return Buffer.from(match[1], 'hex');
  }

  // 3. Générer une nouvelle clé et l'écrire dans .env
  const newKey = crypto.randomBytes(KEY_LEN).toString('hex');
  const line   = '\nENCRYPTION_KEY=' + newKey + '\n';

  try {
    fs.appendFileSync(ENV_PATH, line, 'utf8');
    console.log('[Crypto] Clé de chiffrement générée et sauvegardée dans .env');
  } catch(e) {
    console.warn('[Crypto] Impossible d\'écrire dans .env :', e.message);
  }

  process.env.ENCRYPTION_KEY = newKey;
  return Buffer.from(newKey, 'hex');
}

const KEY = loadOrGenerateKey();

/**
 * Chiffre une chaîne de caractères.
 * Retourne une chaîne base64 contenant : IV (12 bytes) + tag (16 bytes) + ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv         = crypto.randomBytes(IV_LEN);
  const cipher     = crypto.createCipheriv(ALG, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag        = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Déchiffre une chaîne produite par encrypt().
 * Retourne null si la chaîne est invalide ou le déchiffrement échoue.
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const buf        = Buffer.from(ciphertext, 'base64');
    const iv         = buf.subarray(0, IV_LEN);
    const tag        = buf.subarray(IV_LEN, IV_LEN + 16);
    const encrypted  = buf.subarray(IV_LEN + 16);
    const decipher   = crypto.createDecipheriv(ALG, KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch(_) {
    return null;
  }
}

/**
 * Masque une valeur pour l'affichage (ne jamais renvoyer le mot de passe en clair).
 */
function mask(value) {
  if (!value) return '';
  return '••••••••';
}

module.exports = { encrypt, decrypt, mask };
