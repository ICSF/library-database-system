import { useState } from 'react';
import { trpc } from '../../lib/TRPC';
import { MemberForm, type MemberFormValues } from './MemberForm';
import { invalidateMemberFormOptions } from './useMemberFormOptions';

export function AddMember() {
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(values: MemberFormValues) {
    setSubmissionStatus('submitting');

    try {
      const {
        first_name,
        last_name,
        member_type_id,
        dept_id,
        uni_year,
        email,
        comments,
        year_comments,
      } = values;
      await trpc.addMember.mutate({
        first_name,
        last_name,
        member_type_id,
        dept_id,
        uni_year,
        email,
        comments,
        year_comments,
      });
      invalidateMemberFormOptions();
      setSubmissionStatus('success');
      return true;
    } catch (error) {
      console.error('Failed to add member:', error);
      setSubmissionStatus('error');
      return false;
    }
  }

  return (
    <>
      <h1>Add New Member</h1>
      <p className='help'>
        Here, you can add new members. The first name, last name and email fields are compulsory <br/>
        Be wild, be free with the comments sections - general comments persist throughout the years, 
        and year-specific comments are only for this membership year
      </p>
      {/* TODO: better error messages everywhere for reason why unable to add */}
      {submissionStatus === 'success' && <p className="info">Member added successfully.</p>}
      {submissionStatus === 'error' && <p className="error">Unable to add member.</p>}
      <MemberForm
        onSubmit={handleSubmit}
        submitLabel={submissionStatus === 'submitting' ? 'Adding member...' : 'Add member'}
        submitting={submissionStatus === 'submitting'}
        resetOnSubmit
      />
    </>
  );
}
