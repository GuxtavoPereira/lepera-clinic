import { privateCpf, redactCpfText } from '@lepera/contracts';
import { inflateSync } from 'node:zlib';
import { reportCsv, reportPdf } from './report-export';
import { protectReport } from './report-privacy';
import type { OperationalReport } from './report.types';

const raw = '12345678909';
const formatted = '123.456.789-09';
const report: OperationalReport = {
  kind: 'financial',
  title: 'Receitas',
  generatedAt: '2026-11-23T12:00:00Z',
  period: { from: '2026-11-01', to: '2026-11-30' },
  scopeLabel: 'Clínica',
  note: `CPF ${formatted}`,
  columns: ['Descrição', 'Valor'],
  rows: [[`Paciente ${raw}`, 'R$ 12,50']],
  totalRows: 1,
  metrics: [{ label: 'Total', value: 'R$ 12,50' }],
};

describe('CPF privacy in reports', () => {
  it('protects read-only CPF and text without changing source records or amounts', () => {
    expect(privateCpf(formatted)).toBe('***.***.***-09');
    expect(privateCpf('malformed')).toBe('CPF protegido');
    expect(redactCpfText(`${raw} / ${formatted}; R$ 12,50; 23/11/2026`)).toBe(
      '***.***.***-09 / ***.***.***-09; R$ 12,50; 23/11/2026',
    );
    expect(redactCpfText('1234567890123456')).toBe('1234567890123456');
    const safe = protectReport(report);
    expect(JSON.stringify(safe)).not.toContain(raw);
    expect(JSON.stringify(safe)).not.toContain(formatted);
    expect(report.rows[0][0]).toContain(raw);
    expect(safe.metrics).toEqual(report.metrics);
    expect(protectReport(safe)).toEqual(safe);
  });

  it('redacts actual CSV and decoded PDF text, including headings and notes', async () => {
    const csv = reportCsv(report).toString('utf8');
    expect(csv).toContain('***.***.***-09');
    expect(csv).not.toContain(raw);
    const pdf = (await reportPdf(report)).toString('latin1');
    const streams = [...pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map((match) => {
        try {
          return inflateSync(Buffer.from(match[1], 'latin1')).toString(
            'latin1',
          );
        } catch {
          return '';
        }
      })
      .join('\n');
    const text = [...streams.matchAll(/<([a-f0-9]+)>/g)]
      .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
      .join('');
    expect(text).toContain('***.***.***-09');
    expect(text).not.toContain(raw);
    expect(text).not.toContain(formatted);
    expect(text).toContain('R$ 12,50');
  });
});
