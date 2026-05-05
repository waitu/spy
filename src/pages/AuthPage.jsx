import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageMasthead } from '../components/HeroSection';
import { useAuth } from '../context/AuthContext';

function AuthForm({ mode }) {
  const isSignUp = mode === 'signup';
  const location = useLocation();
  const navigate = useNavigate();
  const { signin, signup } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = isSignUp ? 'Create account' : 'Sign in';
  const description = isSignUp
    ? 'Create your account to start using the platform.'
    : 'Sign in to continue.';

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSignUp && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const session = isSignUp
        ? await signup({ email: form.email, password: form.password })
        : await signin({ email: form.email, password: form.password });

      const redirectTarget =
        session.user.role === 'admin' && typeof location.state?.from === 'string'
          ? location.state.from
          : session.user.role === 'admin'
            ? '/admin'
            : '/';

      navigate(redirectTarget, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMasthead eyebrow={isSignUp ? 'Signup' : 'Signin'} title={title} description={description} />
      <section className="site-width auth-layout">
        <div className="auth-shell story-surface">
          <div className="auth-card auth-card--form auth-card--single">
            <div className="auth-card__intro">
              <span className="eyebrow">{isSignUp ? 'Get Started' : 'Welcome Back'}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Minimum 8 characters"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                />
              </label>
              {isSignUp ? (
                <label>
                  Confirm password
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </label>
              ) : null}
              {error ? <div className="auth-error">{error}</div> : null}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <div className="auth-meta">
              <p>
                {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
                <Link to={isSignUp ? '/signin' : '/signup'}>{isSignUp ? 'Sign in' : 'Create one'}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function SignInPage() {
  return <AuthForm mode="signin" />;
}

export function SignUpPage() {
  return <AuthForm mode="signup" />;
}
