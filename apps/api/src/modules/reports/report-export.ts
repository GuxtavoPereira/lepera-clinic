import PDFDocument from 'pdfkit';
// PDFKit loads these lazily; explicit imports retain them in serverless traces.
import 'pdfkit/standard-fonts/Helvetica';
import 'pdfkit/standard-fonts/HelveticaBold';
import type { OperationalReport } from './report.types';

/** Neutraliza fórmulas inclusive quando precedidas de espaços ou controles. */
export function csvCell(value: string): string {
  const first = Array.from(value).find(
    (character) => character.charCodeAt(0) > 31 && character.trim() !== '',
  );
  const safe = first && '=+@-'.includes(first) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function reportCsv(report: OperationalReport): Buffer {
  const lines = [report.columns, ...report.rows].map((row) =>
    row.map(csvCell).join(';'),
  );
  return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
}

function dateLabel(date: string): string {
  return date.split('-').reverse().join('/');
}

export function reportPdf(report: OperationalReport): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true,
      info: {
        Title: report.title,
        Author: 'Leperapia Clinic',
        Subject: 'Relatório operacional',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 36;
    const width = doc.page.width - left * 2;
    const columnWidth = width / report.columns.length;
    const columnTextWidth = columnWidth - 12;
    let y = 0;
    const drawHeading = () => {
      doc.fillColor('#007e79').font('Helvetica-Bold').fontSize(17);
      doc.text('LEPERAPIA CLINIC', left, 30, { lineBreak: false });
      doc.fillColor('#17212b').fontSize(13);
      doc.text(report.title, left, 55, { lineBreak: false });
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      const period =
        report.kind === 'inventory'
          ? 'Posição atual do estoque; não representa um saldo histórico.'
          : `Período inclusivo: ${dateLabel(report.period.from)} a ${dateLabel(report.period.to)} (São Paulo)`;
      doc.text(period, left, 76, { width });
      doc.text(report.scopeLabel, left, 90, { width });
      doc.text(report.note, left, 104, { width, height: 28 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#17212b');
      doc.text(
        report.metrics
          .map((item) => `${item.label}: ${item.value}`)
          .join('   |   '),
        left,
        136,
        { width, height: 28 },
      );
      y = 174;
      doc.rect(left, y, width, 26).fill('#007e79');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      report.columns.forEach((column, index) => {
        doc.text(column, left + index * columnWidth + 6, y + 7, {
          width: columnTextWidth,
          height: 18,
          ellipsis: true,
        });
      });
      y += 26;
    };
    drawHeading();
    for (const [index, row] of report.rows.entries()) {
      doc.font('Helvetica').fontSize(8);
      const rowHeight = Math.max(
        28,
        ...row.map(
          (cell) => doc.heightOfString(cell, { width: columnTextWidth }) + 12,
        ),
      );
      if (y + rowHeight > doc.page.height - 58) {
        doc.addPage();
        drawHeading();
      }
      doc
        .rect(left, y, width, rowHeight)
        .fill(index % 2 ? '#f0f7f6' : '#ffffff');
      doc.fillColor('#17212b').font('Helvetica').fontSize(8);
      row.forEach((cell, column) => {
        doc.text(cell, left + column * columnWidth + 6, y + 6, {
          width: columnTextWidth,
          height: rowHeight - 10,
        });
      });
      y += rowHeight;
    }
    if (!report.rows.length) {
      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text(
        'Nenhum registro encontrado para este relatório.',
        left + 6,
        y + 16,
      );
    }
    const pages = doc.bufferedPageRange();
    const generated = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(report.generatedAt));
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      doc.switchToPage(page);
      // O rodapé ocupa a margem inferior; desabilite a quebra automática nesta faixa.
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.fillColor('#475569').font('Helvetica').fontSize(8);
      doc.text(
        `Emitido em ${generated} • ${report.totalRows} registros • Uso operacional`,
        left,
        doc.page.height - 38,
        { width: width - 90, lineBreak: false },
      );
      doc.text(
        `${page + 1} / ${pages.count}`,
        doc.page.width - 110,
        doc.page.height - 38,
        {
          width: 74,
          align: 'right',
          lineBreak: false,
        },
      );
      doc.page.margins.bottom = bottomMargin;
    }
    doc.end();
  });
}
