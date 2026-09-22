type MemberOption = {
  id: number;
  name: string;
};

const memberTypeOptions: MemberOption[] = [];
const departmentOptions: MemberOption[] = [];

export function AddMember() {
  return (
    <>
      <h1>Add New Member</h1>

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
                <select id="member-type" name="member_type_id" defaultValue="">
                  <option value="" disabled>
                    Select a member type
                  </option>
                  {memberTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.id})
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
                <select id="department" name="dept_id" defaultValue="">
                  <option value="" disabled>
                    Select a course
                  </option>
                  {departmentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.id})
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