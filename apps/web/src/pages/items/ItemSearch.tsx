import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';
import { useAuth } from '../../auth/useAuth';
import { formatSeries, getStatusBadges, type ItemSummary } from './ItemsUtils';

// paginate the query so as to not overload the page with too much data - becomes rlly slow
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

// scrolls when next page is clicked
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ItemSearch() {
  const { profile } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);


  // debounce the raw input before it feeds the actual query, so we don't
  // fire a request on every keystroke against a 16,000-row table.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // reset to page 1 whenever the search text changes
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchInput]);

  useEffect(() => {
    let isCurrent = true;

    async function loadItems() {
      setLoading(true);
      setError(false);

      try {
        const result = await trpc.itemList.query({ search, page, pageSize: PAGE_SIZE });
        if (isCurrent) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (loadError) {
        console.error('Failed to load items:', loadError);
        if (isCurrent) {
          setItems([]);
          setTotal(0);
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isCurrent = false;
    };
  }, [search, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
    scrollToTop();
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
    scrollToTop();
  }

  return (
    <>
      <h1>Items</h1>
      <p className="help">
        Here, you can search for specific items.<br/>
        The status of an item is shown as one or more badges: Borrowable, Damaged, AWOL, and/or Retired.<br/>
        Click 'View' to see full item details.
      </p>

      <form>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor="item-search">Search</label>
              </td>
              <td>
                <input
                  id="item-search"
                  type="search"
                  size={25}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Title, author, series, or ISBN"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </form>
      <br/>

      {loading && <p className="help">Loading items...</p>}
      {error && <p className="error">Unable to load items.</p>}

      <table className="list" width="100%">
        <thead>
          <tr className="bg1">
            <th>Title</th>
            <th>Author</th>
            <th>Series</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr className={index % 2 === 0 ? 'bg2' : 'bg3'} key={item.item_id}>
              <td>{item.title}</td>
              <td>{item.author_name}</td>
              <td>{formatSeries(item.series_name, item.series_num)}</td>
              <td>{item.item_type}</td>
              <td>{item.location}</td>
              <td>{getStatusBadges(item).join(', ')}</td>
              <td>
                <Link to={`/portal/items/view/${item.item_id}`}>View</Link>
                {profile?.isHead ? (
                  <>
                    <br/>
                    <Link to={`/portal/items/edit/${item.item_id}`}>Edit</Link>
                  </>
                ) : ''}
              </td>
              
            </tr>
          ))}
          {!loading && items.length === 0 && (
            <tr className="bg2">
              <td colSpan={7}>
                <p className="help">No items match the current filters.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <p className="help">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={goToPreviousPage}
          >
            Previous
          </button>
          {' '}
          Page {page} of {totalPages} ({total} items)
          {' '}
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={goToNextPage}
          >
            Next
          </button>
        </p>
      )}
    </>
  );
}