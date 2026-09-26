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
  
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0'); 
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
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
