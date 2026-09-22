import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../../lib/TRPC';

type MemberRecord = {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: 'Current' | 'Past' | 'Disabled';
};

type MemberScope = 'current' | 'all';

export function MemberSearch() {
  const [scope, setScope] = useState<MemberScope>('current');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadMembers() {
      setLoading(true);
      setError(false);

      try {
        const records = await trpc.memberList.query({ scope });
        if (isCurrent) {
          setMembers(records);
        }
      } catch (loadError) {
        console.error('Failed to load members:', loadError);
        if (isCurrent) {
          setMembers([]);
          setError(true);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      isCurrent = false;
    };
  }, [scope]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      if (!query) {
        return true;
      }

      return [member.first_name, member.last_name, member.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [members, search]);

  return (
    <>
      <h1>Edit Members</h1>

      <form>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor="member-scope">Show</label>
              </td>
              <td>
                <select
                  id="member-scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as MemberScope)}
                >
                  <option value="current">Current members</option>
                  <option value="all">All members</option>
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="member-search">Search</label>
              </td>
              <td>
                <input
                  id="member-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="First name, last name, or email"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      {loading && <p className="help">Loading members...</p>}
      {error && <p className="error">Unable to load members.</p>}

      <table className="list" width="100%">
        <thead>
          <tr className="bg1">
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredMembers.map((member) => (
            <tr className="bg2" key={member.member_id}>
              <td>{member.first_name} {member.last_name}</td>
              <td>{member.email ?? ''}</td>
              <td>{member.status}</td>
              <td>
                <Link to={`/portal/members/edit/${member.member_id}`}>Edit</Link>{' '}
                <Link to={`/portal/members/edit/${member.member_id}?renew=true`}>Renew</Link>
              </td>
            </tr>
          ))}
          {!loading && filteredMembers.length === 0 && (
            <tr className="bg2">
              <td colSpan={4}>
                <p className="help">No members match the current filters.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}