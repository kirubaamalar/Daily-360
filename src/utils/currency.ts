const cache = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency = 'INR', locale = 'en-IN', compact = false) {
  const key = `${locale}|${currency}|${compact}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    })
    cache.set(key, f)
  }
  return f.format(amount)
}

/** Avoids float drift when summing money: works in paise/cents. */
export const sumMoney = (values: number[]) =>
  values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100

export const CURRENCIES = [
  { code: 'INR', label: 'Indian rupee (₹)', locale: 'en-IN' },
  { code: 'USD', label: 'US dollar ($)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (€)', locale: 'de-DE' },
  { code: 'GBP', label: 'British pound (£)', locale: 'en-GB' },
  { code: 'AED', label: 'UAE dirham', locale: 'en-AE' },
  { code: 'SGD', label: 'Singapore dollar', locale: 'en-SG' },
] as const
