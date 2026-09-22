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

  return (
    <>
      <h1>Add New Member</h1>

      {optionsLoading && <p className="help">Loading member options...</p>}
      {optionsError && (
        <p className="error">Unable to load member type and course options.</p>
      )}

      <form>
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
                <label htmlFor="comments">Comments</label>
              </td>
              <td>
                <textarea id="comments" name="comments" rows={5} />
              </td>
            </tr>
            <tr>
              <td />
              <td>
                <button type="submit">Add member</button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </>
  );
}