import { useState } from 'react';
import { supabase } from './supabase';

const MIN_PASSWORD = 8;

/** Sign up or sign in with email and password. */
export function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setNote('');
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      // No session means the project still wants the email confirmed first.
      else if (!data.session) setNote('Account created. Check your email to confirm it, then sign in.');
    }
    setBusy(false);
  };

  const field: React.CSSProperties = { padding: '8px 10px', fontSize: 15 };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#eef3f7' }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320, fontSize: 14 }}>
        <h2 style={{ margin: 0 }}>{mode === 'in' ? 'Sign in' : 'Sign up'}</h2>
        <input type="email" required autoFocus autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
        <input type="password" required minLength={MIN_PASSWORD} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          placeholder={mode === 'up' ? `Password (${MIN_PASSWORD}+ characters)` : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
        <button type="submit" disabled={busy} style={{ padding: '8px 16px', fontSize: 15 }}>{busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {error && <div role="alert" style={{ color: '#b00020' }}>{error}</div>}
        {note && <div style={{ color: '#2d6a2d' }}>{note}</div>}
        <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); setNote(''); }}
          style={{ background: 'none', border: 'none', color: '#2b66d9', cursor: 'pointer', fontSize: 14 }}>
          {mode === 'in' ? 'New here? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
