import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('gera um hash diferente da senha original', async () => {
    const hash = await service.hash('Senha@123');

    expect(hash).not.toBe('Senha@123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('aceita a senha correta e recusa a errada', async () => {
    const hash = await service.hash('Senha@123');

    await expect(service.verify('Senha@123', hash)).resolves.toBe(true);
    await expect(service.verify('outra-senha', hash)).resolves.toBe(false);
  });
});
