import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const KEY = 'a'.repeat(64);

function serviceWith(key: string) {
  return new EncryptionService({
    getOrThrow: () => key,
  } as unknown as ConfigService);
}

describe('EncryptionService (RNF01)', () => {
  const service = serviceWith(KEY);

  it('cifra e decifra de volta o texto original (com acentos)', () => {
    const plain = 'Paciente relata ansiedade no trabalho — sessão 3.';
    const encrypted = service.encrypt(plain, 'record:1:clinicalNotes');

    expect(encrypted).not.toContain('ansiedade');
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(service.decrypt(encrypted, 'record:1:clinicalNotes')).toBe(plain);
  });

  it('gera valores diferentes para o mesmo texto (IV aleatório)', () => {
    expect(service.encrypt('igual')).not.toBe(service.encrypt('igual'));
  });

  it('falha se o texto cifrado foi adulterado', () => {
    const [v, iv, tag, data] = service.encrypt('segredo').split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;

    expect(() =>
      service.decrypt([v, iv, tag, flipped.toString('base64')].join(':')),
    ).toThrow('Falha ao descriptografar');
  });

  it('falha se o cifrado for movido para outro registro/campo (AAD)', () => {
    const encrypted = service.encrypt('segredo', 'record:1:clinicalNotes');

    expect(() => service.decrypt(encrypted, 'record:2:clinicalNotes')).toThrow(
      'Falha ao descriptografar',
    );
  });

  it('falha com outra chave', () => {
    const encrypted = service.encrypt('segredo');

    expect(() => serviceWith('b'.repeat(64)).decrypt(encrypted)).toThrow(
      'Falha ao descriptografar',
    );
  });

  it('rejeita formato inválido e chave com tamanho errado', () => {
    expect(() => service.decrypt('texto-puro')).toThrow('Formato');
    expect(() => serviceWith('abcd')).toThrow('32 bytes');
  });
});
