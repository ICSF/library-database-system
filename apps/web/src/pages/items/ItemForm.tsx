import { useEffect, useRef, useState } from 'react';
import { trpc } from '../../lib/TRPC';
import { isValidIsbn } from './ItemsUtils';

const AUTHOR_SEARCH_DEBOUNCE_MS = 250;

// TODO: try to obtain this from trpc and also maybe in the member search and item search?
export type ItemFormValues = {
  title: string;
  // author_id is chosen from the autocomplete suggestion list. author_name is always the 
  // text currently shown in the input. If the user types a name without picking a suggestion,
  // author_id is cleared back to null and the backend does a find-or-create by name on save (see itemUpdate).
  author_id: number | null;
  author_name: string;
  series_name: string;
  series_num: string; 
  type_id: number | null;
  location_id: number | null;
  isbn: string;
  is_damaged: boolean;
  is_awol: boolean;
  is_retired: boolean;
  donated_by: string;
  comments: string;
  reviews: string;
};

export type DropdownOption = {
  id: number;
  name: string;
};

type AuthorSuggestion = {
  author_id: number;
  name: string;
};

type ItemFormProps = {
  initialValues: ItemFormValues;
  mediaTypes: DropdownOption[];
  locations: DropdownOption[];
  // Read-only info shown for context but not editable on this form.
  acquireDateDisplay: string;
  retireDateDisplay: string;
  onSubmit: (values: ItemFormValues) => Promise<boolean>;
  submitLabel: string;
  submitting: boolean;
};

export function ItemForm({
  initialValues,
  mediaTypes,
  locations,
  acquireDateDisplay,
  retireDateDisplay,
  onSubmit,
  submitLabel,
  submitting,
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initialValues);
  const [authorSuggestions, setAuthorSuggestions] = useState<AuthorSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);  
  const [isbnTouched, setIsbnTouched] = useState(false);
  const authorBoxRef = useRef<HTMLDivElement>(null);

  // derived, not stored in state: is_borrowable is true exactly when none
  // of the other three status flags are set.
  const isBorrowable = !values.is_damaged && !values.is_awol && !values.is_retired;

  const query = values.author_name.trim();
  const visibleSuggestions =
    suggestionsOpen && query !== '' && values.author_id === null ? authorSuggestions : [];

  // Debounced author search-as-you-type.
  useEffect(() => {
    if (!query || values.author_id !== null) {
      return;
    }

    let isCurrent = true;

    const timeout = setTimeout(async () => {
      try {
        const results = await trpc.authorSearch.query({ search: query });
        if (isCurrent) {
          setAuthorSuggestions(results);
          setSuggestionsOpen(true);
        }
      } catch (searchError) {
        console.error('Author search failed:', searchError);
        if (isCurrent) {
          setAuthorSuggestions([]);
        }
      }
    }, AUTHOR_SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [query, values.author_id]);

  // Close the suggestion dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (authorBoxRef.current && !authorBoxRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAuthorInputChange(text: string) {
    // Free typing always clears any previously locked-in author_id -
    // the user is no longer necessarily referring to that same author
    // until they pick a suggestion again.
    setValues((current) => ({ ...current, author_name: text, author_id: null }));
    setSuggestionsOpen(true);
  }

  function handleAuthorPick(suggestion: AuthorSuggestion) {
    setValues((current) => ({
      ...current,
      author_id: suggestion.author_id,
      author_name: suggestion.name,
    }));
    setSuggestionsOpen(false);
  }

  const isbnError =
    isbnTouched && values.isbn.trim() !== '' && !isValidIsbn(values.isbn)
      ? 'Not a valid ISBN-10 or ISBN-13.'
      : null;

  const authorMissing = values.author_id === null && values.author_name.trim() === '';
  const canSubmit =
    !submitting &&
    values.title.trim() !== '' &&
    !authorMissing &&
    values.type_id !== null &&
    values.location_id !== null &&
    !isbnError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsbnTouched(true);
    if (!canSubmit) {
      return;
    }
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit}>
      <table>
        <tbody>
          <tr>
            <td><label htmlFor="item-title">Title</label></td>
            <td>
              <input
                id="item-title"
                type="text"
                size={40}
                value={values.title}
                onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-author">Author</label></td>
            <td>
              <div ref={authorBoxRef} style={{ position: 'relative' }}>
                <input
                  id="item-author"
                  type="text"
                  size={40}
                  value={values.author_name}
                  onChange={(event) => handleAuthorInputChange(event.target.value)}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Start typing to search existing authors..."
                  autoComplete="off"
                  required
                />
                {visibleSuggestions.length > 0 && (
                  <ul
                    className="autocomplete-list"
                    style={{
                      position: 'absolute',
                      zIndex: 10,
                      background: '#fff',
                      border: '1px solid #ccc',
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      width: '100%',
                    }}
                  >
                    {visibleSuggestions.map((suggestion) => (
                      <li key={suggestion.author_id}>
                        <button
                          type="button"
                          onClick={() => handleAuthorPick(suggestion)}
                          style={{ width: '100%', textAlign: 'left' }}
                        >
                          {suggestion.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {authorMissing && <p className="error">Author is required.</p>}
              <p className="help">
                If the author isn't listed, just finish typing their full name in the form Lastname, Firstname
              </p>
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-series-name">Series</label></td>
            <td>
              <input
                id="item-series-name"
                type="text"
                size={30}
                value={values.series_name}
                onChange={(event) => setValues((current) => ({ ...current, series_name: event.target.value }))}
                placeholder="(optional)"
              />
            </td>
          </tr>

          {/* TODO: Only show series num if series is not blank */}
          <tr>
            <td><label htmlFor="item-series-num">Series #</label></td>
            <td>
              <input
                id="item-series-num"
                type="text"
                size={5}
                value={values.series_num}
                onChange={(event) => setValues((current) => ({ ...current, series_num: event.target.value }))}
                placeholder="(optional)"
              />
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-type">Type</label></td>
            <td>
              <select
                id="item-type"
                value={values.type_id ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, type_id: Number(event.target.value) }))
                }
                required
              >
                <option value="" disabled>Select a type...</option>
                {mediaTypes.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-location">Location</label></td>
            <td>
              <select
                id="item-location"
                value={values.location_id ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, location_id: Number(event.target.value) }))
                }
                required
              >
                <option value="" disabled>Select a location...</option>
                {locations.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-isbn">ISBN</label></td>
            <td>
              <input
                id="item-isbn"
                type="text"
                size={20}
                value={values.isbn}
                onChange={(event) => setValues((current) => ({ ...current, isbn: event.target.value }))}
                onBlur={() => setIsbnTouched(true)}
                placeholder="(optional)"
              />
              {isbnError && <p className="error">{isbnError}</p>}
            </td>
          </tr>

          <tr>
            <td>Status</td>
            <td>
              <label>
                <input type="checkbox" checked={isBorrowable} disabled readOnly />
                {' '}Borrowable <span className="help">(computed automatically)</span>
              </label>
              <br/>
              <label>
                <input
                  type="checkbox"
                  checked={values.is_damaged}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, is_damaged: event.target.checked }))
                  }
                />
                {' '}Damaged
              </label>
              <br/>
              <label>
                <input
                  type="checkbox"
                  checked={values.is_awol}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, is_awol: event.target.checked }))
                  }
                />
                {' '}AWOL
              </label>
              <br/>
              <label>
                <input
                  type="checkbox"
                  checked={values.is_retired}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, is_retired: event.target.checked }))
                  } 
                />
                {' '}Retired
              </label>
            </td>
          </tr>

          <tr>
            <td>Acquire Date</td>
            <td>{acquireDateDisplay || <span className="help">(not recorded)</span>}</td>
          </tr>

          <tr>
            <td>Retire Date</td>
            <td>
              {values.is_retired
                ? (retireDateDisplay || <span className="help">(will be set to today on save)</span>)
                : <span className="help">(not retired)</span>}
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-donated-by">Donated By</label></td>
            <td>
              <input
                id="item-donated-by"
                type="text"
                size={30}
                value={values.donated_by}
                onChange={(event) => setValues((current) => ({ ...current, donated_by: event.target.value }))}
                placeholder="(optional)"
              />
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-comments">Comments</label></td>
            <td>
              <textarea
                id="item-comments"
                rows={3}
                cols={40}
                value={values.comments}
                onChange={(event) => setValues((current) => ({ ...current, comments: event.target.value }))}
              />
            </td>
          </tr>

          <tr>
            <td><label htmlFor="item-reviews">Reviews</label></td>
            <td>
              <textarea
                id="item-reviews"
                rows={3}
                cols={40}
                value={values.reviews}
                onChange={(event) => setValues((current) => ({ ...current, reviews: event.target.value }))}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <br/>
      <button type="submit" disabled={!canSubmit}>{submitLabel}</button>
    </form>
  );
}
