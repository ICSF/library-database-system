import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';
import { useAuth } from '../../auth/useAuth';
import { formatSeries, formatDate, getStatusBadges, type ItemDetail } from './ItemsUtils';


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
              <tr className="bg1">
                <th>Title</th>
                <td>{item.title}</td>
              </tr>
              <tr className="bg2">
                <th>Author</th>
                <td>{item.author_name}</td>
              </tr>
              <tr className="bg3">
                <th>Series</th>
                <td>{formatSeries(item.series_name, item.series_num)}</td>
              </tr>
              <tr className="bg2">
                <th>Type</th>
                <td>{item.item_type}</td>
              </tr>
              <tr className="bg3">
                <th>Location</th>
                <td>{item.location}</td>
              </tr>
              <tr className="bg2">
                <th>ISBN</th>
                <td>{item.isbn ?? ''}</td>
              </tr>
              <tr className="bg3">
                <th>Status</th>
                <td>{getStatusBadges(item).join(', ')}</td>
              </tr>
              <tr className="bg2">
                <th>Acquire Date</th>
                <td>{formatDate(item.acquire_date)}</td>
              </tr>
              <tr className="bg3">
                <th>Retire Date</th>
                <td>{formatDate(item.retire_date)}</td>
              </tr>
              <tr className="bg2">
                <th>Donated By</th>
                <td>{item.donated_by ?? ''}</td>
              </tr>
              <tr className="bg3">
                <th>Comments</th>
                <td>{item.comments ?? ''}</td>
              </tr>
              <tr className="bg2">
                <th>Reviews</th>
                <td>{item.reviews ?? ''}</td>
              </tr>
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
