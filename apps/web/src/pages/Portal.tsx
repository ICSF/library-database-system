// icsf database main page - (c) 2005 icsf
// authors: Michelle Osmond and Michael Wright
// 'feel the randomness'

import { useAuth } from '../auth/useAuth';

export function Portal() {
  const { session } = useAuth();
  return (
    <>
      <h1>Welcome to the ICSF Library Database</h1>
      <p className='help'>You are logged in as {session?.user.email}</p>

      {/* Show some basic statistics for general interest and education */}
      <p className='info'><b>Library Statistics:</b><br></br>
         {/* TODO: member count */}
          Member count: 
      </p>

      <div className="notice">
        <h4>Notices from the Librarian(s)</h4>
        <textarea id="notice" name="Notice" rows={20} cols={97}>
          {/* TODO: allow the content of this textarea to persist. */}
        </textarea>
      </div>
      <br/>
    </>

    
  );
}