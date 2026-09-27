import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';
import { formatDate } from '../items/ItemsUtils';

type LoanRecord = {
  loan_id: string;
  item_id: number;
  title: string;
  author_name: string;
  member_name: string;
  issued_by: string;
  issued_at: string;
  due_at: string;
  notes: string | null;
  times_renewed: number;
};

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

// Each entry is "at least this many days overdue"
const OVERDUE_TIER_THRESHOLDS: { minDaysOverdue: number; tier: string }[] = [
  { minDaysOverdue: 29, tier: 'o5' },
  { minDaysOverdue: 22, tier: 'o4' },
  { minDaysOverdue: 15, tier: 'o3' },
  { minDaysOverdue: 8, tier: 'o2' },
  { minDaysOverdue: 4, tier: 'o1' },
  { minDaysOverdue: 1, tier: 'o0' },
];

// Returns the number of whole days past due
function daysOverdue(dueAt: string): number {
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((today.getTime() - due.getTime()) / msPerDay);
}

// Returns null when not overdue at all.
function getOverdueClasses(dueAt: string): string | null {
  const overdueDays = daysOverdue(dueAt);
  if (overdueDays < 1) {
    return null;
  }

  const match = OVERDUE_TIER_THRESHOLDS.find((entry) => overdueDays >= entry.minDaysOverdue);
  const tier = match?.tier ?? 'o0';
  return `overdue ${tier}`;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ViewLoans() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Debounce the raw input before it feeds the actual query - same
  // pattern as ItemSearch, to avoid firing a request on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchInput]);

  useEffect(() => {
    let isCurrent = true;

    async function loadLoans() {
      setLoading(true);
      setError(false);

      try {
        const result = await trpc.loanList.query({ search, page, pageSize: PAGE_SIZE });
        if (isCurrent) {
          setLoans(result.loans);
          setTotal(result.total);
        }
      } catch (loadError) {
        console.error('Failed to load loans:', loadError);
        if (isCurrent) {
          setLoans([]);
          setTotal(0);
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadLoans();

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
      <h1>Return Loans</h1>
      <p className="help">
        Here, you can see every item currently on loan.<br/>
        Overdue loans are highlighted - the color darkens the longer a loan has been overdue.<br/>
        Click 'Manage' to view the loan and mark it as returned or to renew it. 
      </p>

      <form>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor="loan-search">Search</label>
              </td>
              <td>
                <input
                  id="loan-search"
                  type="search"
                  size={25}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Title, author, or member name"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </form>
      <br/>

      {loading && <p className="help">Loading loans...</p>}
      {error && <p className="error">Unable to load loans.</p>}

      <table className="list" width="100%">
        <thead>
          <tr className="bg1">
            <th>Title</th>
            <th>Author</th>
            <th>Loaned By</th>
            <th>Issued By</th>
            <th>Issue Date</th>
            <th>Due Date</th>
            <th>Times Renewed</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan, index) => {
            const rowShade = index % 2 === 0 ? 'bg2' : 'bg3';
            const overdueClasses = getOverdueClasses(loan.due_at);

            return (
              <tr className={rowShade} key={loan.loan_id}>
                <td>{loan.title}</td>
                <td>{loan.author_name}</td>
                <td>{loan.member_name}</td>
                <td>{loan.issued_by}</td>
                <td>{formatDate(loan.issued_at)}</td>
                <td className={overdueClasses ?? undefined}>
                  {formatDate(loan.due_at)}
                  {overdueClasses ? ' (Overdue)' : ''}
                </td>
                <td>{loan.times_renewed}</td>
                <td>{loan.notes ?? ''}</td>
                <td>
                  <Link to={`/portal/items/loan/${loan.item_id}`} state={{ from: 'returns' }}>Manage</Link>
                </td>
              </tr>
            );
          })}
          {!loading && loans.length === 0 && (
            <tr className="bg2">
              <td colSpan={8}>
                <p className="help">No loans match the current filters.</p>
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
          Page {page} of {totalPages} ({total} loans)
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
