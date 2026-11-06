import { IsIn, Matches } from 'class-validator';

export const REPORT_KINDS = [
  'appointments',
  'financial',
  'inventory',
  'professionals',
  'demand',
  'patients',
  'stock-movements',
  'satisfaction',
  'audit',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export class ReportQueryDto {
  @IsIn(REPORT_KINDS, { message: 'Selecione um tipo de relatório válido' })
  kind!: ReportKind;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data inicial no formato AAAA-MM-DD',
  })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data final no formato AAAA-MM-DD',
  })
  to!: string;
}

export class ExportReportQueryDto extends ReportQueryDto {
  @IsIn(['pdf', 'csv'], { message: 'Escolha PDF ou CSV para exportar' })
  format!: 'pdf' | 'csv';
}
