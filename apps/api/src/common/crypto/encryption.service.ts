import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // tamanho recomendado para GCM

/**
 * Criptografia dos dados clínicos em repouso (RNF01).
 *
 * Formato gravado: "v1:<iv>:<tag>:<dados>" (base64). Cada gravação usa um IV
 * novo, então o mesmo texto nunca produz o mesmo valor cifrado.
 *
 * `aad` (dado associado) amarra o texto cifrado ao seu registro/campo: se
 * alguém copiar o cifrado de uma linha para outra, a decifragem falha.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(config.getOrThrow<string>('ENCRYPTION_KEY'), 'hex');
    if (this.key.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hexadecimais)',
      );
    }
  }

  encrypt(plain: string, aad?: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));

    const data = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      VERSION,
      iv.toString('base64'),
      tag.toString('base64'),
      data.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string, aad?: string): string {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('Formato de dado criptografado inválido');
    }
    const [, iv, tag, data] = parts;

    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
        Buffer.from(iv, 'base64'),
      );
      if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));

      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error(
        'Falha ao descriptografar: dado adulterado ou chave incorreta',
      );
    }
  }
}
