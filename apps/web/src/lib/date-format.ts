const ptBrDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const ptBrDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDatePtBr(value: string) {
  return ptBrDateFormatter.format(new Date(value));
}

export function formatDateTimePtBr(value: string) {
  return ptBrDateTimeFormatter.format(new Date(value));
}
