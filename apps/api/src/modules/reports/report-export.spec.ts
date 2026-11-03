import { inflateSync } from 'node:zlib';
import { csvCell, reportCsv, reportPdf } from './report-export';
import type { OperationalReport } from './report.types';

const report = (rows: string[][]): OperationalReport => ({
  kind: 'appointments',
  title: 'Relatório de consultas',
  period: { from: '2026-11-01', to: '2026-11-30' },
  generatedAt: '2026-11-02T12:00:00Z',
  scopeLabel: 'Consultas da clínica',
  note: 'Sem conteúdo de prontuário.',
  columns: ['Data', 'Paciente', 'Profissional'],
  rows,
  totalRows: rows.length,
  metrics: [{ label: 'Consultas', value: String(rows.length) }],
});

describe('Exportação de relatórios', () => {
  it.each([
    '=HYPERLINK("https://example.test")',
    '+123',
    '-1',
    '@SUM(A1)',
    '  =1+1',
    '\t=1+1',
    '\r=1+1',
  ])('neutraliza fórmula CSV %p', (value) => {
    expect(csvCell(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
  });

  it('preserva aspas, separadores e quebras de linha dentro da célula', () => {
    const result = reportCsv(
      report([['01/11', 'Maria; "Silva"\nSouza', '=1+1']]),
    );
    expect(result.subarray(0, 3).toString('hex')).toBe('efbbbf');
    expect(result.toString('utf8')).toContain(
      '"Maria; ""Silva""\nSouza";"\'=1+1"',
    );
  });

  it('gera PDF real, pagina a tabela e repete cabeçalhos sem perder a última linha', async () => {
    const rows = Array.from({ length: 100 }, (_, index) => [
      '05/11/2026 10:00',
      `Paciente ${index}`,
      index === 99 ? 'ULTIMO_REGISTRO' : 'Profissional',
    ]);
    const pdf = await reportPdf(report(rows));
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const source = pdf.toString('latin1');
    const pages = source.match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(pages).toBeGreaterThan(1);
    const decoded = [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
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
    const text = [...decoded.matchAll(/\[([^\]]+)\]\s*TJ/g)]
      .map((match) =>
        [...match[1].matchAll(/<([a-f0-9]+)>/g)]
          .map((hex) => Buffer.from(hex[1], 'hex').toString('latin1'))
          .join(''),
      )
      .join('\n');
    expect(text).toContain('ULTIMO_REGISTRO');
    expect(text.split('LEPERAPIA CLINIC').length - 1).toBe(pages);
    expect(text.split('\nPaciente\n').length - 1).toBe(pages);
    expect(text).toContain(`${pages} / ${pages}`);
  });

  it('gera PDF legível também para um relatório sem registros', async () => {
    const pdf = await reportPdf(report([]));
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1);
  });
});
