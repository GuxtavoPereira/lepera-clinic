import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

for (const timeZone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
  test(`a agenda mantém o horário e o dia de Brasília em ${timeZone}`, () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { formatDateTimePtBr } from './src/lib/date-format.ts';
      console.log(JSON.stringify([
        '2031-06-18T09:15:00.000Z',
        '2031-06-18T02:59:00.000Z',
        '2031-06-18T03:00:00.000Z',
      ].map(formatDateTimePtBr)));
    `], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, TZ: timeZone },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [
      '18/06/31, 06:15', '17/06/31, 23:59', '18/06/31, 00:00',
    ]);
  });
}
