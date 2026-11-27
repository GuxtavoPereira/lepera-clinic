import PDFDocument from 'pdfkit';
// PDFKit loads these lazily; explicit imports retain them in serverless traces.
import 'pdfkit/standard-fonts/Helvetica';
import 'pdfkit/standard-fonts/HelveticaBold';
import {
  clinicalDocumentStatusLabels,
  clinicalDocumentTypeLabels,
  privateCpf,
  type ClinicalDocumentStatus,
  type ClinicalDocumentType,
} from '@lepera/contracts';

export type ClinicalDocumentPdfInput = {
  id: string;
  type: ClinicalDocumentType;
  title: string;
  documentNumber: string | null;
  version: number;
  status: ClinicalDocumentStatus;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patientName: string;
  patientCpf: string | null;
  doctorName: string;
  doctorLicense: string;
  doctorSpecialty: string;
  sections: Array<{ key: string; label: string; value: string }>;
};

const dateTimePtBr = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function clinicalDocumentPdf(
  input: ClinicalDocumentPdfInput,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      bufferPages: true,
      info: {
        Title: input.title,
        Author: input.doctorName,
        Subject: clinicalDocumentTypeLabels[input.type],
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 48;
    const width = doc.page.width - left * 2;

    // Header
    doc.fillColor('#007e79').font('Helvetica-Bold').fontSize(16);
    doc.text('LEPERAPIA CLINIC', left, 42);
    doc.fillColor('#475569').font('Helvetica').fontSize(9);
    doc.text(
      `${clinicalDocumentTypeLabels[input.type]} · Versão ${input.version}${
        input.documentNumber ? ` · Nº ${input.documentNumber}` : ''
      } · ${clinicalDocumentStatusLabels[input.status]}`,
      left,
      62,
      { width },
    );

    doc
      .moveTo(left, 80)
      .lineTo(left + width, 80)
      .strokeColor('#cbd5e1')
      .stroke();

    // Title
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14);
    doc.text(input.title, left, 92, { width });

    // Metadata box
    const metaY = doc.y + 8;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    const maskedCpf = input.patientCpf
      ? privateCpf(input.patientCpf)
      : 'Não informado';
    doc.text(
      `Paciente: ${input.patientName}   |   CPF: ${maskedCpf}`,
      left,
      metaY,
      {
        width,
      },
    );
    doc.text(
      `Profissional: ${input.doctorName} · ${input.doctorLicense} · ${input.doctorSpecialty}`,
      left,
      doc.y + 3,
      { width },
    );
    doc.text(
      input.signedAt
        ? `Assinado internamente em ${dateTimePtBr.format(input.signedAt)} (horário de Brasília)`
        : `Rascunho atualizado em ${dateTimePtBr.format(input.updatedAt)} (horário de Brasília) — documento não assinado`,
      left,
      doc.y + 3,
      { width },
    );

    doc.moveDown(1.1);

    // Sections
    for (const section of input.sections) {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
      doc.fillColor('#007e79').font('Helvetica-Bold').fontSize(10.5);
      doc.text(section.label, left, doc.y, { width });
      doc.moveDown(0.25);
      doc.fillColor('#1e293b').font('Helvetica').fontSize(10);
      const body = section.value.trim() || 'Não informado.';
      doc.text(body, left, doc.y, { width, lineGap: 2 });
      doc.moveDown(0.9);
    }

    // Signature / disclaimer footer note
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    doc.moveDown(0.6);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.moveDown(0.5);
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5);
    doc.text(
      'Documento gerado pela Leperapia Clinic. A assinatura registrada no sistema é de controle interno e não substitui certificação digital qualificada. Documento de uso sigiloso, sujeito à revisão técnica do profissional responsável.',
      left,
      doc.y,
      { width },
    );

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8);
      doc.text(
        `Página ${i + 1} de ${pages.count} · Emitido em ${dateTimePtBr.format(new Date())}`,
        left,
        doc.page.height - 34,
        { width, align: 'right' },
      );
    }

    doc.end();
  });
}
