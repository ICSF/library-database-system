import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';
import { useAuth } from '../../auth/useAuth';
import { formatSeries, formatDate, getStatusBadges, type ItemDetail } from './ItemsUtils';

// dynamically calculate bg of row depending on how many fields visible
function rowClass(index: number): string {
  if (index === 0) {
    return 'bg1';
  }
  return index % 2 === 1 ? 'bg2' : 'bg3';
}

type DetailRow = {
  label: string;
  value: React.ReactNode;
  show?: boolean;
};

export function ViewItem() {
  const { itemId } = useParams<{ itemId: string }>();
  const { profile } = useAuth();
  
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadItem() {
      setLoading(true);
      setError(false);
      setNotFound(false);

      const parsedId = Number(itemId);

      if (!itemId || Number.isNaN(parsedId)) {
        if (isCurrent) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      try {
        const record = await trpc.itemGet.query({ item_id: parsedId });
        if (isCurrent) {
          if (record) {
            setItem(record);
          } else {
            setNotFound(true);
          }
        }
      } catch (loadError) {
        console.error('Failed to load item:', loadError);
        if (isCurrent) {
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadItem();

    return () => {
      isCurrent = false;
    };
  }, [itemId]);

  const rows: DetailRow[] = item
    ? [
        { label: 'Title', value: item.title },
        { label: 'Author', value: item.author_name },
        { label: 'Series', value: formatSeries(item.series_name, item.series_num) },
        { label: 'Type', value: item.item_type },
        { label: 'Location', value: item.location },
        { label: 'ISBN', value: item.isbn ?? '' },
        { label: 'Status', value: getStatusBadges(item).join(', ') },
        { label: 'Acquire Date', value: formatDate(item.acquire_date) },
        { label: 'Retire Date', value: formatDate(item.retire_date), show: item.is_retired },
        { label: 'Donated By', value: item.donated_by ?? '' },
        { label: 'Comments', value: item.comments ?? '' },
        { label: 'Reviews', value: item.reviews ?? '' },
      ]
    : [];

  const visibleRows = rows.filter((row) => row.show !== false);

  return (
    <>
      <h1>Item Details</h1>
      <p className="help">
        <Link to="/portal/items/search">&lt;= Back to item search</Link>
      </p>

      {loading && <p className="help">Loading item...</p>}
      {error && <p className="error">Unable to load this item.</p>}
      {notFound && !loading && !error && <p className="error">Item not found.</p>}

      {!loading && !error && !notFound && item && (
        <>
          <table className="list" width="99%">
            <tbody>
              {visibleRows.map((row, index) => (
                <tr className={rowClass(index)} key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <br/>

          {profile?.isHead && (
            <p className="help">
              <Link to={`/portal/items/edit/${item.item_id}`}>Edit this item</Link>
            </p>
          )}
        </>
      )}
    </>
  );
}
