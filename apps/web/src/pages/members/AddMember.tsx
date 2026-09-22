import { useEffect, useState } from 'react';
import { trpc } from '../../lib/TRPC';

type MemberOption = {
  id: number;
  name: string;
};

export function AddMember() {
  const [memberTypeOptions, setMemberTypeOptions] = useState<MemberOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<MemberOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    let isCurrent = true;

    async function loadOptions() {
      try {
        const options = await trpc.memberFormOptions.query();
        if (isCurrent) {
          setMemberTypeOptions(options.memberTypes);
          setDepartmentOptions(options.departments);
        }
      } catch (error) {
        console.error('Failed to load member form options:', error);
        if (isCurrent) {
          setOptionsError(true);
        }
      } finally {
        if (isCurrent) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isCurrent = false;
    };
  }, []);

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

      {optionsLoading && <p className="help">Loading member options...</p>}
      {optionsError && (
        <p className="error">Unable to load member type and course options.</p>
      )}
      {submissionStatus === 'success' && <p className="info">Member added successfully.</p>}
      {submissionStatus === 'error' && <p className="error">Unable to add member.</p>}

      <form onSubmit={handleSubmit}>
        <table>
          <tbody>
            <tr>
              <td className="required">
                <label htmlFor="first-name">First name</label>
              </td>
              <td>
                <input id="first-name" name="first_name" type="text" required />
              </td>
            </tr>
            <tr>
              <td className="required">
                <label htmlFor="last-name">Last name</label>
              </td>
              <td>
                <input id="last-name" name="last_name" type="text" required />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="member-type">Member type</label>
              </td>
              <td>
                <select
                  id="member-type"
                  name="member_type_id"
                  defaultValue=""
                  disabled={optionsLoading || optionsError}
                >
                  <option value="" disabled>
                    {optionsLoading ? 'Loading member types...' : 'Select a member type'}
                  </option>
                  {memberTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="department">Course</label>
              </td>
              <td>
                <select
                  id="department"
                  name="dept_id"
                  defaultValue=""
                  disabled={optionsLoading || optionsError}
                >
                  <option value="" disabled>
                    {optionsLoading ? 'Loading courses...' : 'Select a course'}
                  </option>
                  {departmentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="uni-year">University year</label>
              </td>
              <td>
                <input id="uni-year" name="uni_year" type="text" />
              </td>
            </tr>
            <tr>
              <td className="required">
                <label htmlFor="email">Email</label>
              </td>
              <td>
                <input id="email" name="email" type="email" required />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="comments">General Comments</label>
              </td>
              <td>
                <textarea id="comments" name="comments" rows={5} />
              </td>
            </tr>
             <tr>
              <td>
                <label htmlFor="year-comments">Year-Specific Comments</label>
              </td>
              <td>
                <textarea id="year-comments" name="year_comments" rows={5} />
              </td>
            </tr>
            <tr>
              <td />
              <td>
                <button type="submit" disabled={submissionStatus === 'submitting'}>
                  {submissionStatus === 'submitting' ? 'Adding member...' : 'Add member'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </>
  );
}