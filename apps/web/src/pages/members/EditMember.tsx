import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MemberForm } from './MemberForm';

export function EditMember() {
  const { memberId } = useParams();
  const location = useLocation();
  const [renewed, setRenewed] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const renewRequested = new URLSearchParams(location.search).get('renew') === 'true';

  function handleRenew() {
    setRenewed(true);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveAttempted(true);
  }

  return (
    <>
      <h1>Edit Member</h1>
      <p className="help">Member ID: {memberId}</p>
      {renewRequested && <p className="info">Renewal selected. Saving is not connected yet.</p>}
      {renewed && <p className="info">Renewal prepared. Saving is not connected yet.</p>}
      {saveAttempted && <p className="info">Saving is not connected yet.</p>}
      <MemberForm
        onSubmit={handleSave}
        submitLabel="Save changes"
        showDisableFields
        onRenew={handleRenew}
      />
      <p><Link to="/portal/members/search">Cancel</Link></p>
    </>
  );
}
