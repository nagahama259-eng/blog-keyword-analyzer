const numberFormatter = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}
