/* Shared types and helpers for item pages */

export type ItemStatusFlags = {
  is_borrowable: boolean;
  is_damaged: boolean;
  is_awol: boolean;
  is_retired: boolean;
};

// fields returned by the itemList API call - item overview
export type ItemSummary = ItemStatusFlags & {
  item_id: number;
  title: string;
  author_name: string;
  series_name: string | null;
  series_num: string | null;
  item_type: string;
  location: string;
  isbn: string | null;
};

// fields returned by itemGet API call
export type ItemDetail = ItemSummary & {
  comments: string | null;
  reviews: string | null;
  retire_date: string | null;
  acquire_date: string | null;
  donated_by: string | null;
};

// Format Series + series num nicely
export function formatSeries(seriesName: string | null, seriesNum: string | null): string {
  if (!seriesName) {
    return '';
  }
  return seriesNum != null ? `${seriesName} #${seriesNum}` : seriesName;
}

// Dates come back from the API as ISO strings - render as a date DD/MM/YYYY
export function formatDate(value: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getStatusBadges(item: ItemStatusFlags): string[] {
  const badges: string[] = [];

  if (item.is_borrowable) {
    badges.push('Borrowable');
  }
  if (item.is_damaged) {
    badges.push('Damaged');
  }
  if (item.is_awol) {
    badges.push('AWOL');
  }
  if (item.is_retired) {
    badges.push('Retired');
  }

  return badges;
}

// helper functions for validating ISBNs
function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const char = value[i];
    const digit = char === 'X' ? 10 : Number(char);
    sum += (10 - i) * digit;
  }

  return sum % 11 === 0;
}

function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const digit = Number(value[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  return sum % 10 === 0;
}

// Accepts hyphens/spaces in the input (e.g. "978-0-13-468599-1") and
// strips them before validating. An empty string is not valid
export function isValidIsbn(rawValue: string): boolean {
  const value = rawValue.replace(/[-\s]/g, '').toUpperCase();

  if (value.length === 10) {
    return isValidIsbn10(value);
  }
  if (value.length === 13) {
    return isValidIsbn13(value);
  }
  return false;
}