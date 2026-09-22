import { useState } from 'react';
import { trpc } from '../../lib/TRPC';
import { MemberForm } from './MemberForm';

export function AddMember() {
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionStatus('submitting');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const optionalNumber = (name: string) => {
      const value = formData.get(name)?.toString() ?? '';
      return value ? Number(value) : null;
    };
    const optionalText = (name: string) => {
      const value = formData.get(name)?.toString().trim() ?? '';
      return value || null;
    };

    try {
      await trpc.addMember.mutate({
        first_name: formData.get('first_name')?.toString().trim() ?? '',
        last_name: formData.get('last_name')?.toString().trim() ?? '',
        member_type_id: optionalNumber('member_type_id'),
        dept_id: optionalNumber('dept_id'),
        uni_year: optionalText('uni_year'),
        email: formData.get('email')?.toString().trim() ?? '',
        comments: optionalText('comments'),
        year_comments: optionalText('year_comments'),
      });
      form.reset();
      setSubmissionStatus('success');
    } catch (error) {
      console.error('Failed to add member:', error);
      setSubmissionStatus('error');
    }
  }

  return (
    <>
      <h1>Add New Member</h1>
      {submissionStatus === 'success' && <p className="info">Member added successfully.</p>}
      {submissionStatus === 'error' && <p className="error">Unable to add member.</p>}
      <MemberForm
        onSubmit={handleSubmit}
        submitLabel={submissionStatus === 'submitting' ? 'Adding member...' : 'Add member'}
        submitting={submissionStatus === 'submitting'}
      />
    </>
  );
}
