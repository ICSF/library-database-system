import { useState } from 'react';
import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@library/api';
import { useMemberFormOptions } from './useMemberFormOptions';

type RouterInputs = inferRouterInputs<AppRouter>;
export type MemberFormValues = Omit<RouterInputs['updateMember'], 'member_id'>;

type MemberFormProps = {
  onSubmit: (values: MemberFormValues) => boolean | Promise<boolean>;
  submitLabel: string;
  submitting?: boolean;
  resetOnSubmit?: boolean;
  showDisableFields?: boolean;
  onRenew?: (values: MemberFormValues) => void | Promise<void>;
  initialValues?: Partial<MemberFormValues>;
};

export function MemberForm({
  onSubmit,
  submitLabel,
  submitting = false,
  resetOnSubmit = false,
  showDisableFields = false,
  onRenew,
  initialValues,
}: MemberFormProps) {
  const { memberTypeOptions, departmentOptions, loading: optionsLoading, error: optionsError } = useMemberFormOptions();
  const [isDisabled, setIsDisabled] = useState(initialValues?.is_disabled ?? false);
  const [memberTypeValue, setMemberTypeValue] = useState(
    initialValues?.member_type_id?.toString() ?? '',
  );
  const [departmentValue, setDepartmentValue] = useState(
    initialValues?.dept_id?.toString() ?? '',
  );

  function parseForm(form: HTMLFormElement): MemberFormValues {
    // Keep browser form markup and API payload conversion in one place for
    // Add Member, Edit Member, and Renew.
    const formData = new FormData(form);
    const optionalNumber = (name: string) => {
      const value = formData.get(name)?.toString() ?? '';
      return value ? Number(value) : null;
    };
    const optionalText = (name: string) => {
      const value = formData.get(name)?.toString().trim() ?? '';
      return value || null;
    };

    return {
      first_name: formData.get('first_name')?.toString().trim() ?? '',
      last_name: formData.get('last_name')?.toString().trim() ?? '',
      member_type_id: optionalNumber('member_type_id'),
      dept_id: optionalNumber('dept_id'),
      uni_year: optionalText('uni_year'),
      email: formData.get('email')?.toString().trim() ?? '',
      comments: optionalText('comments'),
      year_comments: optionalText('year_comments'),
      is_disabled: formData.get('is_disabled') === 'on',
      disabled_reason: optionalText('disabled_reason'),
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitted = await onSubmit(parseForm(form));
    // Add Member opts into reset behavior - Edit Member keeps the saved values
    // visible by refetching and remounting with fresh initial values.
    if (resetOnSubmit && submitted) {
      form.reset();
      setMemberTypeValue('');
      setDepartmentValue('');
    }
  }

  return (
    <>
      {optionsLoading && <p className="help">Loading member options...</p>}
      {optionsError && (
        <p className="error">Unable to load member type and course options.</p>
      )}

      <form onSubmit={handleSubmit}>
        <table>
          <tbody>
            <tr>
              <td className="required">
                <label htmlFor="first-name">First name</label>
              </td>
              <td>
                <input
                  id="first-name"
                  name="first_name"
                  type="text"
                  defaultValue={initialValues?.first_name ?? ''}
                  required
                />
              </td>
            </tr>
            <tr>
              <td className="required">
                <label htmlFor="last-name">Last name</label>
              </td>
              <td>
                <input
                  id="last-name"
                  name="last_name"
                  type="text"
                  defaultValue={initialValues?.last_name ?? ''}
                  required
                />
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
                  value={memberTypeValue}
                  onChange={(event) => setMemberTypeValue(event.target.value)}
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
                  value={departmentValue}
                  onChange={(event) => setDepartmentValue(event.target.value)}
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
                <input
                  id="uni-year"
                  name="uni_year"
                  type="text"
                  defaultValue={initialValues?.uni_year ?? ''}
                />
              </td>
            </tr>
            <tr>
              <td className="required">
                <label htmlFor="email">Email</label>
              </td>
              <td>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={initialValues?.email ?? ''}
                  required
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="comments">General Comments</label>
              </td>
              <td>
                <textarea
                  id="comments"
                  name="comments"
                  rows={5}
                  cols={30}
                  defaultValue={initialValues?.comments ?? ''}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="year-comments">Year-Specific Comments</label>
              </td>
              <td>
                <textarea
                  id="year-comments"
                  name="year_comments"
                  rows={5}
                  cols={30}
                  defaultValue={initialValues?.year_comments ?? ''}
                />
              </td>
            </tr>
            {showDisableFields && (
              <>
                <tr>
                  <td>
                    <label htmlFor="is-disabled">Disable member</label>
                  </td>
                  <td>
                    <input
                      id="is-disabled"
                      name="is_disabled"
                      type="checkbox"
                      defaultChecked={initialValues?.is_disabled ?? false}
                      onChange={(event) => setIsDisabled(event.target.checked)}
                    />
                  </td>
                </tr>
                {isDisabled && (
                  <tr>
                    <td className="required">
                      <label htmlFor="disabled-reason">Reason for Disabling</label>
                    </td>
                    <td>
                      <textarea
                        id="disabled-reason"
                        name="disabled_reason"
                        rows={5}
                        cols={30}
                        defaultValue={initialValues?.disabled_reason ?? ''}
                        required
                      />
                    </td>
                  </tr>
                )}
              </>
            )}
            <tr>
              <td />
              <td>
                <button type="submit" disabled={submitting}>
                  {submitLabel}
                </button>{' '}
                {onRenew && (
                  <button
                    type="button"
                    onClick={(event) => {
                      if (event.currentTarget.form) {
                        void onRenew(parseForm(event.currentTarget.form));
                      }
                    }}
                  >
                    Renew
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </>
  );
}
