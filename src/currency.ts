export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  // West Africa
  { code: 'GHS', symbol: 'GH₵', name: 'GHS (GH₵ / Ghanaian Cedi)', locale: 'en-GH' },
  { code: 'NGN', symbol: '₦', name: 'NGN (₦ / Nigerian Naira)', locale: 'en-NG' },
  { code: 'GMD', symbol: 'D', name: 'GMD (D / Gambian Dalasi)', locale: 'en-GM' },
  { code: 'SLL', symbol: 'Le', name: 'SLL (Le / Sierra Leonean Leone)', locale: 'en-SL' },
  { code: 'LRD', symbol: '$', name: 'LRD ($ / Liberian Dollar)', locale: 'en-LR' },
  { code: 'XOF', symbol: 'CFA', name: 'XOF (CFA / West African Franc)', locale: 'fr-CI' },
  
  // East & Central Africa
  { code: 'KES', symbol: 'KSh', name: 'KES (KSh / Kenyan Shilling)', locale: 'en-KE' },
  { code: 'UGX', symbol: 'USh', name: 'UGX (USh / Ugandan Shilling)', locale: 'en-UG' },
  { code: 'RWF', symbol: 'FRw', name: 'RWF (FRw / Rwandan Franc)', locale: 'en-RW' },
  { code: 'TZS', symbol: 'TSh', name: 'TZS (TSh / Tanzanian Shilling)', locale: 'en-TZ' },
  { code: 'XAF', symbol: 'FCFA', name: 'XAF (FCFA / Central African Franc)', locale: 'fr-CM' },

  // Southern & North Africa
  { code: 'ZAR', symbol: 'R', name: 'ZAR (R / South African Rand)', locale: 'en-ZA' },
  { code: 'EGP', symbol: 'E£', name: 'EGP (E£ / Egyptian Pound)', locale: 'ar-EG' },

  // Global & International Currencies
  { code: 'USD', symbol: '$', name: 'USD ($ / US Dollar)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'EUR (€ / Euro)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'GBP (£ / British Pound Sterling)', locale: 'en-GB' },
  { code: 'INR', symbol: '₹', name: 'INR (₹ / Indian Rupee)', locale: 'en-IN' },
  { code: 'CAD', symbol: 'C$', name: 'CAD (C$ / Canadian Dollar)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'AUD (A$ / Australian Dollar)', locale: 'en-AU' },
  { code: 'AED', symbol: 'د.إ', name: 'AED (د.إ / UAE Dirham)', locale: 'ar-AE' },
  { code: 'SAR', symbol: 'ر.س', name: 'SAR (ر.س / Saudi Riyal)', locale: 'ar-SA' },
];

export function getCurrencyInfo(code: string): CurrencyInfo {
  const cleanCode = (code || 'GHS').toUpperCase();
  const found = SUPPORTED_CURRENCIES.find(c => c.code === cleanCode);
  if (found) return found;
  return {
    code: cleanCode,
    symbol: cleanCode,
    name: cleanCode,
    locale: 'en-US'
  };
}

export function formatCurrencyValue(num: number, currencyCode: string = 'GHS'): string {
  const info = getCurrencyInfo(currencyCode);
  return info.symbol + " " + num.toLocaleString(info.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getSafePdfCurrencySymbol(currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode);
  // standard ASCII fonts in jsPDF do not print higher unicode like € or ₦ or ₵.
  // We use standard letters when writing pdf lines if we can't draw the symbol,
  // or return a simpler abbreviation, or return the symbol if safe.
  if (info.code === 'USD') return '$';
  if (info.code === 'GBP') return String.fromCharCode(163); // £
  if (info.code === 'EUR') return String.fromCharCode(128); // €
  return info.code; // Return standard standard letter code (e.g. GHS, NGN, KES) to bypass glyph rendering issues in jsPDF
}
