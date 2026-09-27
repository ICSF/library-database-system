import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TRPCClientError } from '@trpc/client';
import { trpc } from '../../lib/TRPC';
import { formatDate, type ItemDetail } from '../items/ItemsUtils'

const MEMBER_SEARCH_DEBOUNCE_MS = 250;
const LOAN_LENGTH_DAYS = 28;

type MemberSuggestion = {
  member_id: string;
  name: string;
  email: string | null;
};

// Discriminated on `onLoan` - when true, the extra loan/borrower fields are
// present; when false, there's nothing else to show and the issue form
// should render instead.
type LoanStatus =
  | { onLoan: false }
  | {
      onLoan: true;
      loan_id: string;
      issued_at: string;
      due_at: string;
      notes: string | null;
      member_id: string;
      member_name: string;
      issued_by: string;
      times_renewed: number;
    };

// figure out where the link was clicked from
type LoanItemLocationState = {
  from?: 'returns';
};

// Client-side date preview only
function previewDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + LOAN_LENGTH_DAYS);
  return formatDate(date.toISOString());
}

// TODO: abstract this out
function rowClass(index: number): string {
  if (index === 0) {
    return 'bg1';
  }
  return index % 2 === 1 ? 'bg2' : 'bg3';
}

export function LoanItem() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loanStatus, setLoanStatus] = useState<LoanStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // bumped after a successful loan/return so that the page shows the loan table/issue form 
  const [refreshKey, setRefreshKey] = useState(0);

  // Member autocomplete - submit button disabled until member clicked
  const [memberQuery, setMemberQuery] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberSuggestions, setMemberSuggestions] = useState<MemberSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const memberBoxRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  const [returnStatus, setReturnStatus] = useState<'idle' | 'returning' | 'error'>('idle');
  const [returnErrorMessage, setReturnErrorMessage] = useState<string | null>(null);

  const [renewStatus, setRenewStatus] = useState<'idle' | 'renewing' | 'error'>('idle');
  const [renewErrorMessage, setRenewErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      setLoading(true);
      setLoadError(false);
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
        const [itemRecord, status] = await Promise.all([
          trpc.itemGet.query({ item_id: parsedId }),
          trpc.itemLoanStatus.query({ item_id: parsedId }),
        ]);

        if (!isCurrent) {
          return;
        }

        if (!itemRecord) {
          setNotFound(true);
          return;
        }

        setItem(itemRecord);
        setLoanStatus(status);
      } catch (error) {
        console.error('Failed to load loan page data:', error);
        if (isCurrent) {
          setLoadError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isCurrent = false;
    };
  }, [itemId, refreshKey]);

  // Debounced member search-as-you-type
  const trimmedQuery = memberQuery.trim();

  useEffect(() => {
    if (!trimmedQuery || memberId !== null) {
      return;
    }

    let isCurrent = true;

    const timeout = setTimeout(async () => {
      try {
        const results = await trpc.memberSearch.query({ search: trimmedQuery });
        if (isCurrent) {
          setMemberSuggestions(results);
          setSuggestionsOpen(true);
        }
      } catch (searchError) {
        console.error('Member search failed:', searchError);
        if (isCurrent) {
          setMemberSuggestions([]);
        }
      }
    }, MEMBER_SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [trimmedQuery, memberId]);

  // Close the suggestion dropdown on outside click.
  // TODO: abstract this functionality
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (memberBoxRef.current && !memberBoxRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived, not stored in state 
  const visibleSuggestions =
    suggestionsOpen && trimmedQuery !== '' && memberId === null ? memberSuggestions : [];

  function handleMemberInputChange(text: string) {
    setMemberQuery(text);
    // Free typing always clears any previously locked-in member - the
    // form should never submit with a stale id that no longer matches
    // what's shown in the box.
    setMemberId(null);
    setSuggestionsOpen(true);
  }

  function handleMemberPick(suggestion: MemberSuggestion) {
    setMemberId(suggestion.member_id);
    setMemberQuery(suggestion.name);
    setSuggestionsOpen(false);
  }

  const memberMissing = memberId === null;
  const showMemberError = submitAttempted && memberMissing;
  const canSubmit = submitStatus !== 'submitting' && memberId !== null;

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!canSubmit || memberId === null) {
      return;
    }

    const parsedId = Number(itemId);
    if (!itemId || Number.isNaN(parsedId)) {
      return;
    }

    setSubmitStatus('submitting');
    setSubmitErrorMessage(null);

    try {
      await trpc.loanCreate.mutate({
        item_id: parsedId,
        member_id: memberId,
        notes: notes.trim() === '' ? null : notes.trim(),
      });

      // Refresh page to show loan table info
      setSubmitStatus('idle');
      setSubmitAttempted(false);
      setMemberId(null);
      setMemberQuery('');
      setNotes('');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      console.error('Failed to create loan:', error);
      setSubmitStatus('error');
      setSubmitErrorMessage(
        error instanceof TRPCClientError ? error.message : 'Unable to issue loan.',
      );
    }
  }

  async function handleReturn() {
    if (!loanStatus || !loanStatus.onLoan || returnStatus === 'returning') {
      return;
    }

    setReturnStatus('returning');
    setReturnErrorMessage(null);

    try {
      await trpc.loanReturn.mutate({ loan_id: loanStatus.loan_id });
      const state = location.state as LoanItemLocationState | null;
      if (state?.from === 'returns') {
        // Reached via the Return Loans list - return there
        navigate('/portal/loans/search');
        return;
      }

      // Re-run the data-loading effect so the page flips from "on loan"
      setReturnStatus('idle');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      console.error('Failed to return item:', error);
      setReturnStatus('error');
      setReturnErrorMessage(
        error instanceof TRPCClientError ? error.message : 'Unable to return item.',
      );
    }
  }

  async function handleRenew() {
    if (loanStatus?.onLoan !== true) {
      return;
    }

    setRenewStatus('renewing');
    setRenewErrorMessage(null);

    try {
      await trpc.loanRenew.mutate({ loan_id: loanStatus.loan_id });
      setRefreshKey((key) => key + 1);
      setRenewStatus('idle');
    } catch (error) {
      console.error('Failed to renew loan:', error);
      setRenewStatus('error');
      setRenewErrorMessage(
        error instanceof TRPCClientError ? error.message : 'Unable to renew loan.',
      );
    }
  }

  const loanRows =
    loanStatus && loanStatus.onLoan && item
      ? [
          { label: 'Title', value: item.title},
          { label: 'Author', value: item.author_name},
          { label: 'Loaned By', value: loanStatus.member_name },
          { label: 'Issued By', value: loanStatus.issued_by },
          { label: 'Issue Date', value: formatDate(loanStatus.issued_at) },
          { label: 'Due Date', value: formatDate(loanStatus.due_at) },
          { label: 'Times Renewed', value: loanStatus.times_renewed },
          { label: 'Notes', value: loanStatus.notes ?? '', show: !!loanStatus.notes },
        ].filter((row) => row.show !== false)
      : [];

  const visibleLoanRows = loanRows.filter((row) => row.show !== false);

  return (
    <>
      <h1>Loan/Return Item</h1>
      <p className='help'>
        Here, you can loan items, or return/renew items if they are already loaned. <br/>
        Loans will be due 28 days from the date of issuing, after which they will be classed as overdue/will need to be renewed <br/>
        If someone knows they cannot give something back within 28 days, you can click 'renew' a few times to extend the due date.
      </p>
      <p className="help">
        {location?.state?.from === 'returns' ? (
          <Link to="/portal/loans/search">&lt;= Back to loans search</Link>
        ) : (
          <Link to="/portal/items/search">&lt;= Back to item search</Link>
        )}
      </p>

      {loading && <p className="help">Loading item...</p>}
      {loadError && <p className="error">Unable to load this item.</p>}
      {notFound && !loading && !loadError && <p className="error">Item not found.</p>}

      {!loading && !loadError && !notFound && item && loanStatus && (
        <>
          {loanStatus.onLoan ? (
            <>
              <p className="help">
                This item is currently on loan
              </p>
              {returnStatus === 'error' && <p className="error">{returnErrorMessage}</p>}

              <table className="list" width="99%">
                <tbody>
                  {visibleLoanRows.map((row, index) => (
                    <tr className={rowClass(index)} key={row.label}>
                      <th>{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <br/>

              <button
                type="button"
                onClick={handleReturn}
                disabled={returnStatus === 'returning'}
                style={{ marginRight: '12px' }}
              >
                {returnStatus === 'returning' ? 'Returning...' : 'Mark as Returned'}
              </button>

              <button
                type="button"
                onClick={handleRenew}
                disabled={renewStatus === 'renewing'}
              >
                {renewStatus === 'renewing' ? 'Renewing...' : 'Renew'}
              </button>
              {renewStatus === 'error' && <p className="error">{renewErrorMessage}</p>}

            </>
          ) : (
            <>
            <p className='help'>
                {item.title} - {item.author_name}
            </p>
            <form onSubmit={handleSubmit}>
              <table>
                <tbody>
                  <tr>
                    <td className="required"><label htmlFor="loan-member">Member</label></td>
                    <td>
                      <div ref={memberBoxRef} style={{ position: 'relative' }}>
                        <input
                          id="loan-member"
                          type="text"
                          size={30}
                          value={memberQuery}
                          onChange={(event) => handleMemberInputChange(event.target.value)}
                          onFocus={() => setSuggestionsOpen(true)}
                          placeholder="Start typing a member's name or email"
                          autoComplete="off"
                        />
                        {visibleSuggestions.length > 0 && (
                          <ul
                            style={{
                              position: 'absolute',
                              zIndex: 10,
                              margin: 0,
                              padding: '4px 0',
                              listStyle: 'none',
                              background: '#fff',
                              border: '1px solid #ccc',
                              width: '100%',
                              maxHeight: 200,
                              overflowY: 'auto',
                            }}
                          >
                            {visibleSuggestions.map((suggestion) => (
                              <li
                                key={suggestion.member_id}
                                onClick={() => handleMemberPick(suggestion)}
                                style={{ padding: '4px 8px', cursor: 'pointer' }}
                              >
                                {suggestion.name}
                                {suggestion.email ? ` (${suggestion.email})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {showMemberError && (
                        <p className="error">
                          Select a member from the suggestion list - new members can&apos;t be
                          created from this form.
                        </p>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><label htmlFor="loan-due">Due date</label></td>
                    <td>
                      <input id="loan-due" type="text" value={previewDueDate()} disabled />
                      <p className="help">
                        Loans run for {LOAN_LENGTH_DAYS} days from today.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td><label htmlFor="loan-notes">Notes</label></td>
                    <td>
                      <textarea
                        id="loan-notes"
                        rows={4}
                        cols={30}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </td>
                  </tr>
                  {submitStatus === 'error' && (
                    <tr>
                      <td />
                      <td><p className="error">{submitErrorMessage}</p></td>
                    </tr>
                  )}
                  <tr>
                    <td />
                    <td>
                      <button type="submit" disabled={!canSubmit}>
                        {submitStatus === 'submitting' ? 'Issuing loan...' : 'Issue loan'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
            </>
          )}
        </>
      )}
    </>
  );
}
