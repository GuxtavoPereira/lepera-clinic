import { BadRequestException } from '@nestjs/common';
import { isValidCpf } from './cpf';
import { ageInYears, parseBirthDate } from './dates';

describe('isValidCpf', () => {
  it('aceita CPFs válidos', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('11144477736')).toBe(false);
  });

  it('recusa sequências repetidas e tamanho errado', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('529.982.247-25')).toBe(false); // exige só dígitos
  });
});

describe('datas', () => {
  const now = new Date('2026-10-13T15:00:00.000Z');

  it('aceita data de nascimento válida', () => {
    expect(parseBirthDate('1990-05-20', now).toISOString()).toBe(
      '1990-05-20T12:00:00.000Z',
    );
  });

  it.each(['2026-10-14', '1899-12-31', '2026-02-31', 'abc', '2026-13-01'])(
    'recusa data de nascimento inválida: %s',
    (value) => {
      expect(() => parseBirthDate(value, now)).toThrow(BadRequestException);
    },
  );

  it('calcula a idade considerando o aniversário', () => {
    const birth = new Date('2008-10-14T12:00:00.000Z');
    expect(ageInYears(birth, now)).toBe(17); // faz 18 amanhã
    expect(ageInYears(birth, new Date('2026-10-14T12:00:00.000Z'))).toBe(18);
  });
});
