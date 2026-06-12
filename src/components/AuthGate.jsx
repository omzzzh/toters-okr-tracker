import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import LoginPage from '../pages/LoginPage';

const ALLOWED_DOMAIN = 'totersapp.com';

export const AuthContext = React.createContext(null);

export default function AuthGate({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = still loading
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !firebaseUser.email.endsWith('@' + ALLOWED_DOMAIN)) {
        // Shouldn't happen, but guard anyway
        signOut(auth);
        setUser(null);
        setError('Only @' + ALLOWED_DOMAIN + ' accounts are allowed.');
      } else {
        setUser(firebaseUser || null);
      }
    });
  }, []);

  const signIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email  = result.user.email;
      if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
        await signOut(auth);
        setUser(null);
        setError('Access denied. Only @' + ALLOWED_DOMAIN + ' accounts are allowed.');
      }
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  // Still checking auth state
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)' }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--rule2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <LoginPage onSignIn={signIn} error={error} loading={loading} />;

  return (
    <AuthContext.Provider value={{ user, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
