import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';
import { MemberForm, type MemberFormValues } from './MemberForm';

export function EditMember() {
  const { memberId } = useParams();
  const [member, setMember] = useState<MemberFormValues | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [renewStatus, setRenewStatus] = useState<'idle' | 'renewing' | 'success' | 'already_current' | 'error'>('idle');
  const [yearCommentsWarning, setYearCommentsWarning] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadMember() {
      if (!memberId) {
        setLoadError(true);
        setLoading(false);
        return;
      }

      try {
        const record = await trpc.memberById.query({ member_id: memberId });
        if (isCurrent) {
          setMember(record);
        }
      } catch (error) {
        console.error('Failed to load member:', error);
        if (isCurrent) {
          setLoadError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadMember();

    return () => {
      isCurrent = false;
    };
  }, [memberId]);

  async function handleRenew(values: MemberFormValues) {
    if (!memberId) {
      setRenewStatus('error');
      return;
    }

    setRenewStatus('renewing');
    setYearCommentsWarning(null);

    try {
      const result = await trpc.renewMember.mutate({
        member_id: memberId,
        ...values,
      });
      const refreshedMember = await trpc.memberById.query({ member_id: memberId });
      setMember(refreshedMember);
      setFormVersion((version) => version + 1);
      setRenewStatus(result.status);
    } catch (error) {
      console.error('Failed to renew member:', error);
      setRenewStatus('error');
    }
  }

  async function handleSave(values: MemberFormValues) {
    if (!memberId) {
      setSaveStatus('error');
      return false;
    }

    setSaveStatus('saving');
    setYearCommentsWarning(null);

    try {
      const result = await trpc.updateMember.mutate({
        member_id: memberId,
        ...values,
      });
      // The shared form uses default values, so refetch and remount it after
      // saving to show the database state rather than stale initial values.
      const refreshedMember = await trpc.memberById.query({ member_id: memberId });
      setMember(refreshedMember);
      setFormVersion((version) => version + 1);
      setSaveStatus('success');

      // if they have no membership row for the current year
      if (!result.yearCommentsSaved) {
        setYearCommentsWarning(
          `Can't update year-specific comments, as ${result.name} is not a member this year.`,
        );
      }
      return true;
    } catch (error) {
      console.error('Failed to update member:', error);
      setSaveStatus('error');
      return false;
    }
  }

  return (
    <>
      <h1>Edit Member</h1>
      <p className="help">
        Here, you can edit member details. Disabling a member means that they are banned from borrowing books, for whatever reason. <br/>
      </p>
      {renewStatus === 'success' && member && <p className="info">{member.first_name} {member.last_name} renewed successfully.</p>}
      {renewStatus === 'already_current' && member && (
        <p className="error">{member.first_name} {member.last_name} is already a member this year.</p>
      )}
      {renewStatus === 'error' && <p className="error">Unable to renew member.</p>}
      {loading && <p className="help">Loading member...</p>}
      {loadError && <p className="error">Unable to load member.</p>}
      {saveStatus === 'success' && <p className="info">Member updated successfully.</p>}
      {saveStatus === 'success' && yearCommentsWarning && <p className="error">{yearCommentsWarning}</p>}
      {saveStatus === 'error' && <p className="error">Unable to update member.</p>}
      {!loading && !loadError && member && (
        <MemberForm
          key={formVersion}
          initialValues={member}
          onSubmit={handleSave}
          submitLabel={saveStatus === 'saving' ? 'Saving changes...' : 'Save changes'}
          submitting={saveStatus === 'saving'}
          showDisableFields
          onRenew={handleRenew}
        />
      )}
      <p><Link to="/portal/members/search">Cancel</Link></p>
    </>
  );
}
