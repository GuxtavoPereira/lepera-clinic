import { redactCpfText } from '@lepera/contracts';
import type { OperationalReport } from './report.types';

export function protectReport(report: OperationalReport): OperationalReport {
  return {
    ...report,
    title: redactCpfText(report.title),
    scopeLabel: redactCpfText(report.scopeLabel),
    note: redactCpfText(report.note),
    columns: report.columns.map(redactCpfText),
    rows: report.rows.map((row) => row.map(redactCpfText)),
    metrics: report.metrics.map((metric) => ({
      label: redactCpfText(metric.label),
      value: redactCpfText(metric.value),
    })),
  };
}
