import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useAuth } from '../auth/useAuth';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 4 + i);
const LATEST_YEAR = CURRENT_YEAR;

export function Topbar() {
  const { profile, signOut } = useAuth();
  const isHead = profile?.isHead;

  const [currentYear, setCurrentYear] = useState<number>(CURRENT_YEAR);
  const [pendingYear, setPendingYear] = useState<number>(CURRENT_YEAR);

  // TODO: link to database
  function handleSwitchYear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentYear(pendingYear);
  }

  return (
    <div className="portal-topbar" style={{ textAlign: 'center' }}>
      <table width="100%">
        <tbody>
          <tr>
            <td align="left">
              {isHead ? (
                <form className="yearSwitch" onSubmit={handleSwitchYear}>
                  <select
                    name="SwitchYear"
                    value={pendingYear}
                    onChange={(e) => setPendingYear(Number(e.target.value))}
                  >
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <input type="submit" value="Switch Year" />
                </form>
              ) : (
                <>
                  {currentYear} - {currentYear + 1}
                  {currentYear !== LATEST_YEAR && (
                    <span className="warning">
                      : not the latest year! (talk to head librarian)
                    </span>
                  )}
                </>
              )}
            </td>

            <td align="center">
              <span className="quote">randomness</span>
            </td>

            <td align="right">
              <b>{profile?.role}</b> logged in.{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => void signOut()}
              >
                Log out?
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
