import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function Sidebar() {
    const { profile } = useAuth();
    const isHead = profile?.isHead;;

    return (
        <aside className="menubar">
            <div style={{ textAlign: 'center' }}>
                <Link to="/portal" id="logo">
                  <img
                    src={`/logo_${isHead ? 'head' : 'duty'}.gif`}
                    alt="ICSF"
                    style={{ border: 0, margin: '10px 0' }}
                  />
                </Link>
            </div>

            {/* DUTY LIBRARIAN LINKS */}
            <table>
                <thead>
                    <tr>
                        <th>Duty Librarian</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Issue Loan */}
                    <tr>
                        <td>
                            <Link to="/portal/loans/loan" accessKey='l'>
                                <u>L</u>oans (Issue, Return)
                            </Link>
                        </td>
                    </tr>
                    {/* Add Members */}
                    <tr>
                        <td>
                            <Link to="/portal/members/add">Add Members</Link>
                        </td>
                    </tr>
                    {/* Edit Members */}
                    <tr>
                        <td>
                            <Link to="/portal/members/search">View/Edit Members</Link>
                        </td>
                    </tr>
                    {/* Search Catalogue */}
                    <tr>
                        <td>
                            <Link to="/portal/items/search" accessKey="s">
                                <u>S</u>earch for an Item
                            </Link>
                        </td>
                    </tr>
                    {/* Disabled Accounts */}
                    <tr>
                        <td>
                            <Link to="/portal/reports/disabled_members">
                                Disabled Accounts
                            </Link>
                        </td>
                    </tr>
                    {/* View Overdue Loans */}
                    <tr>
                        <td>
                            <Link to="/portal/reports/items_overdue">
                                View Overdues
                            </Link>
                        </td>
                    </tr>
                    {/* Recent Borrowing Activity */}
                    <tr>
                        <td>
                            <Link to="/portal/reports/recent_activity">
                                Recent Activity
                            </Link>
                        </td>
                    </tr>
                </tbody>
            </table>
            <br />

            {/* HEAD LIBRARIAN LINKS */}
            {isHead && (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Head Librarian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Add Item */} {/* TODO: why is the first letter in u*/}
                            <tr>
                                <td>
                                  <Link to="/portal/items/add" accessKey="a">
                                    <u>A</u>dd Item
                                  </Link>{' '}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Link to="/portal/items/edit">Edit Item</Link>
                                </td>
                            </tr>
                            {/* Edit Authors */}
                            <tr>
                                <td>
                                  <Link to="/portal/authors/search">Edit Author</Link>
                                </td>
                            </tr>
                            {/* Overdue Reminders */}
                            <tr>
                              <td>
                                <Link to="/portal/loans/overdue-reminders">Overdue Reminders</Link>
                              </td>
                            </tr>
                            {/* Book Recalls */}
                            <tr>
                              <td>
                                <Link to="/portal/loans/recall">Book Recalls</Link>
                              </td>
                            </tr>
                            {/* Email Templates */}
                            <tr>
                              <td>
                                <Link to="/portal/admin/email-templates">Email Templates</Link>
                              </td>
                            </tr>
                            {/* Backups */}
                            <tr>
                              <td>
                                <Link to="/portal/admin/backups">Backups</Link>
                              </td>
                            </tr>
                            {/* Annual Rollover */}
                            <tr>
                              <td>
                                <Link to="/portal/admin/rollover">Annual Rollover</Link>
                              </td>
                            </tr>
                        </tbody>
                    </table>
                    <br />
                </>
            )}

            {/* REPORTS LINKS */}
            <table>
                <thead>
                  <tr>
                    <th>Reports</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="submenu">Items</span>
                      <ul>
                        <li>
                          <Link to="/portal/reports/items-newest">New this Month</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/loans">on Loan</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/items-overdue">Overdue</Link>
                        </li> 
                        {isHead && (
                          <>
                            <li>
                              <Link to="/portal/reports/bookcrawl">for Bookcrawl</Link>
                            </li>
                            <li>
                              <Link to="/portal/reports/stockcheck">for Stock Check</Link>
                            </li>
                          </>
                        )}
                        <li>
                          <Link to="/portal/reports/items-damaged">Damaged</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/items-awol">AWOL Items</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/items-not-borrowable">Not Borrowable</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/items-wcomments">With Comments</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/items-retired">Retired Items</Link>
                        </li>
                      </ul>
                    </td>
                  </tr>
                    
                  {isHead && (
                    <tr>
                      <td>
                        <span className="submenu">Authors</span>
                        <ul>
                          <li>
                            <Link to="/portal/reports/authors-noitems">with No Items</Link>
                          </li>
                        </ul>
                      </td>
                    </tr>
                  )}
          
                  <tr>
                    <td>
                      <span className="submenu">Members</span>
                      <ul>
                        <li>
                          <Link to="/portal/reports/members-by-number">by Number</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/members-by-dept">by Dept</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/disabled-members">Disabled</Link>
                        </li>
                      </ul>
                    </td>
                  </tr>
              
                  <tr>
                    <td>
                      <span className="submenu">Statistics</span>
                      <ul>
                        <li>
                          <Link to="/portal/reports/loanstats-summary">Grand Summary</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/loanstats-popular-items">Popular Items</Link>{' '}
                          (<Link to="/portal/reports/loanstats-allyears-popular-items">ever!</Link>)
                        </li>
                        <li>
                          <Link to="/portal/reports/loanstats-popular-authors">Popular Authors</Link>{' '}
                          (<Link to="/portal/reports/loanstats-allyears-popular-authors">ever!</Link>)
                        </li>
                        <li>
                          <Link to="/portal/reports/loanstats-popular-series">Popular Series</Link>{' '}
                          (<Link to="/portal/reports/loanstats-allyears-popular-series">ever!</Link>)
                        </li>
                        <li>
                          <Link to="/portal/reports/loans?all=true">All Loans (list)</Link>
                        </li>
                        <li>
                          <Link to="/portal/reports/loanstats-borrowers">Borrowers</Link>
                        </li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
            </table>
            <br />

            {/* DATABASE ADMIN */}
            {isHead && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Database Admin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Link to="/portal/admin/item-type-loc">Item Types/Locations</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Link to="/portal/admin/departments">Departments</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Link to="/portal/admin/members">Members/Membership</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Link to="/portal/admin/supermembers">Cross-year members</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Link to="/portal/reports/scratch-variables">Scratch Variables</Link>
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />

              <table>
                <thead>
                  <tr>
                    <th>Database Dev</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Link to="/portal/admin/config">Installation/Config</Link>...
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="/api-docs/">API classes/functions</a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="https://sproutliner.com/lists/icsfdb">ToDo list</a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {/* TODO: point at wherever bug reports now live */}
                      <a href="#">Bug reports</a>
                    </td>
                  </tr>
                </tbody>
                </table>
                <br />
                </>
            )}

            {/* OTHER RELEVANT ICSF LINKS */}
            <table>
                <thead>
                  <tr>
                    <th>Other ICSF links</th>
                  </tr>
                </thead>
                <tbody>
                  {/*<tr>
                    <td>
                      <a href="/wiki/">ICSF Wiki</a>
                    </td>
                  </tr>*/}
                  <tr>
                    <td>
                      <a href="https://icsf.github.io/icsf/">ICSF Website</a>
                    </td>
                  </tr>
                  {/* TODO: fix link and add more?*/}
                  <tr>
                    <td>
                      <a href="https://www.icsf.co.uk/frameset.php?warp=requestlist">ICSF Request List</a>
                    </td>
                  </tr>
                </tbody>
            </table>
            <br />


        </aside>
    )
}