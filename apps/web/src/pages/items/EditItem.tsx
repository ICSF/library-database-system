import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TRPCClientError } from '@trpc/client';
import { trpc } from '../../lib/TRPC';
import { formatDate } from './ItemsUtils';
import { ItemForm, type ItemFormValues, type DropdownOption } from './ItemForm';

export function EditItem() {
  const { itemId } = useParams<{ itemId: string }>();

  const [item, setItem] = useState<ItemFormValues | null>(null);
  const [acquireDate, setAcquireDate] = useState<string | null>(null);
  const [retireDate, setRetireDate] = useState<string | null>(null);
  const [mediaTypes, setMediaTypes] = useState<DropdownOption[]>([]);
  const [locations, setLocations] = useState<DropdownOption[]>([]);
  const [formVersion, setFormVersion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

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
        const [record, types, locs] = await Promise.all([
          trpc.itemGet.query({ item_id: parsedId }),
          trpc.mediaTypeList.query(),
          trpc.locationList.query(),
        ]);

        if (!isCurrent) {
          return;
        }

        if (!record) {
          setNotFound(true);
          return;
        }

        setMediaTypes(types);
        setLocations(locs);
        setAcquireDate(record.acquire_date);
        setRetireDate(record.retire_date);
        setItem({
          title: record.title,
          author_id: record.author_id,
          author_name: record.author_name,
          series_name: record.series_name ?? '',
          series_num: record.series_num ?? '',
          type_id: record.type_id,
          location_id: record.location_id,
          isbn: record.isbn ?? '',
          is_damaged: record.is_damaged,
          is_awol: record.is_awol,
          is_retired: record.is_retired,
          donated_by: record.donated_by ?? '',
          comments: record.comments ?? '',
          reviews: record.reviews ?? '',
        });
      } catch (error) {
        console.error('Failed to load item:', error);
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
  }, [itemId]);

  async function handleSave(values: ItemFormValues) {
    const parsedId = Number(itemId);
    if (!itemId || Number.isNaN(parsedId)) {
      setSaveStatus('error');
      return false;
    }

    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      const result = await trpc.itemUpdate.mutate({
        item_id: parsedId,
        title: values.title,
        author_id: values.author_id,
        author_name: values.author_name,
        series_name: values.series_name.trim() === '' ? null : values.series_name.trim(),
        series_num: values.series_num.trim() === '' ? null : values.series_num.trim(),        type_id: values.type_id as number,
        location_id: values.location_id as number,
        isbn: values.isbn.trim() === '' ? null : values.isbn.trim(),
        is_damaged: values.is_damaged,
        is_awol: values.is_awol,
        is_retired: values.is_retired,
        donated_by: values.donated_by.trim() === '' ? null : values.donated_by.trim(),
        comments: values.comments.trim() === '' ? null : values.comments,
        reviews: values.reviews.trim() === '' ? null : values.reviews,
      });

      // Re-sync from the server response (author_id may now be populated
      // from a find-or-create, retire_date may have just been set/cleared)
      // and remount the form via formVersion so it shows the saved state
      // rather than stale local values.
      setAcquireDate(result.acquire_date);
      setRetireDate(result.retire_date);
      setItem({
        title: result.title,
        author_id: result.author_id,
        author_name: result.author_name,
        series_name: result.series_name ?? '',
        series_num: result.series_num != null ? String(result.series_num) : '',
        type_id: result.type_id,
        location_id: result.location_id,
        isbn: result.isbn ?? '',
        is_damaged: result.is_damaged,
        is_awol: result.is_awol,
        is_retired: result.is_retired,
        donated_by: result.donated_by ?? '',
        comments: result.comments ?? '',
        reviews: result.reviews ?? '',
      });
      setFormVersion((version) => version + 1);
      setSaveStatus('success');
      return true;
    } catch (error) {
      console.error('Failed to update item:', error);
      setSaveStatus('error');
      setSaveErrorMessage(
        error instanceof TRPCClientError ? error.message : 'Unable to update item.',
      );
      return false;
    }
  }

  return (
    <>
      <h1>Edit Item</h1>
      <p className="help">
        Here, you can edit item details. To add an author, type the author's name in the format
        'Lastname, Firstname'. If the author already exists, their name should appear as you type, in 
        which case you can click them. If the author does not exist, just type in the name and save it :)
      </p>

      {loading && <p className="help">Loading item...</p>}
      {loadError && <p className="error">Unable to load this item.</p>}
      {notFound && !loading && !loadError && <p className="error">Item not found.</p>}
      {saveStatus === 'success' && <p className="info">Item updated successfully.</p>}
      {saveStatus === 'error' && <p className="error">{saveErrorMessage}</p>}

      {!loading && !loadError && !notFound && item && (
        <ItemForm
          key={formVersion}
          initialValues={item}
          mediaTypes={mediaTypes}
          locations={locations}
          acquireDateDisplay={formatDate(acquireDate)}
          retireDateDisplay={formatDate(retireDate)}
          onSubmit={handleSave}
          submitLabel={saveStatus === 'saving' ? 'Saving changes...' : 'Save changes'}
          submitting={saveStatus === 'saving'}
        />
      )}

      <p><Link to={`/portal/items/view/${itemId}`}>Cancel</Link></p>
    </>
  );
}
