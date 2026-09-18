import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

interface LocationState {
    from?: string;
}

export function Login() {
    const { session, signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const redirectTo = (location.state as LocationState | null)?.from ?? '/portal';

    // if already signed in 
    if (session) {
        return <Navigate to={redirectTo} replace />;
    }

    async function handleLogin() {
        setError(null);
        setSubmitting(true);

        const { error: signInError } = await signIn(email, password);
        setSubmitting(false);

        if (signInError) {
            setError('Incorrect email or password');
            return;
        }

        navigate(redirectTo, { replace: true });
    }

    // HTML
    return (
        <>
        <h1>ICSF Library Database</h1>
        <p className='help'>O frabjous day! Callooh! Callay! - Please login. If you don't know how, contact the head librarian :)</p>
        
        {error && <p role="alert">{error}</p>}

        <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
        >
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Log in'}
            </button>
        </form>

        </>
    )
}