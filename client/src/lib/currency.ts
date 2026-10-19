const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

/** All prices are stored and displayed in Myanmar kyat (MMK). */
export function formatPrice(amount: number): string {
  return `${amountFormatter.format(amount)} MMK`;
}