import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRPCClientError } from '@trpc/client';
import { trpc } from '../../lib/TRPC';
import { ItemForm, type ItemFormValues, type DropdownOption } from './ItemForm';

const EMPTY_ITEM: ItemFormValues = {
  title: '',
  author_id: null,
  author_name: '',
  series_name: '',
  series_num: '',
  type_id: null,
  location_id: null,
  isbn: '',
  is_damaged: false,
  is_awol: false,
  is_retired: false,
  donated_by: '',
  comments: '',
  reviews: '',
};

export function AddItem() {
  const [mediaTypes, setMediaTypes] = useState<DropdownOption[]>([]);
  const [locations, setLocations] = useState<DropdownOption[]>([]);
  const [formVersion, setFormVersion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadDropdowns() {
      setLoading(true);
      setLoadError(false);

      try {
        const [types, locs] = await Promise.all([
          trpc.mediaTypeList.query(),
          trpc.locationList.query(),
        ]);
        if (isCurrent) {
          setMediaTypes(types);
          setLocations(locs);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        if (isCurrent) {
          setLoadError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadDropdowns();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleCreate(values: ItemFormValues) {
    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      await trpc.itemCreate.mutate({
        title: values.title,
        author_id: values.author_id,
        author_name: values.author_name,
        series_name: values.series_name.trim() === '' ? null : values.series_name.trim(),
        series_num: values.series_num.trim() === '' ? null : values.series_num.trim(),
        type_id: values.type_id as number,
        location_id: values.location_id as number,
        isbn: values.isbn.trim() === '' ? null : values.isbn.trim(),
        donated_by: values.donated_by.trim() === '' ? null : values.donated_by.trim(),
        comments: values.comments.trim() === '' ? null : values.comments,
        reviews: values.reviews.trim() === '' ? null : values.reviews,
      });

      setSaveStatus('success');
      setFormVersion((version) => version + 1);
      return true;
    } catch (error) {
      console.error('Failed to create item:', error);
      setSaveStatus('error');
      setSaveErrorMessage(
        error instanceof TRPCClientError ? error.message : 'Unable to create item.',
      );
      return false;
    }
  }

  return (
    <>
      <h1>Add Item</h1>
      <p className="help">
        Here, you can add a new item to the catalogue. <br/>
        New items start out Borrowable, with today's date recorded as the acquire date. <br/>
        To add an author, type the author's name in the format 'Lastname, Firstname'.<br/>
        If the author already exists, their name should appear as you type, in 
        which case you can click them. <br/>
        If the author does not exist, just type in the name and save it :)
      </p>

      {loading && <p className="help">Loading form...</p>}
      {loadError && <p className="error">Unable to load form data.</p>}
      {saveStatus === 'error' && <p className="error">{saveErrorMessage}</p>}
      {saveStatus === 'success' && <p className="info">Item added successfully.</p>}

      {!loading && !loadError && (
        <ItemForm
          key={formVersion}
          mode="add"
          initialValues={EMPTY_ITEM}
          mediaTypes={mediaTypes}
          locations={locations}
          onSubmit={handleCreate}
          submitLabel={saveStatus === 'saving' ? 'Adding item...' : 'Add item'}
          submitting={saveStatus === 'saving'}
        />
      )}

      <p><Link to="/portal/items/search">Cancel</Link></p>
    </>
  );
}
