import type { ReportKind } from './dto/report-query.dto';

export const MAX_REPORT_ROWS = 5_000;
export const REPORT_PREVIEW_ROWS = 100;

export type OperationalReport = {
  kind: ReportKind;
  title: string;
  period: { from: string; to: string };
  generatedAt: string;
  scopeLabel: string;
  note: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
  metrics: { label: string; value: string }[];
};

export type ReportPreview = OperationalReport & { previewLimit: number };
