import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { user, loading, error, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    await loginWithGoogle();
  };

  return (
    <main 
      className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex flex-col items-center justify-center p-4 relative overflow-hidden"
      role="main"
      aria-label="EcoTrace Authentication Page"
    >
      {/* Decorative background circles */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-white/5 -top-40 -left-40 blur-3xl" aria-hidden="true" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-white/5 -bottom-20 -right-20 blur-3xl" aria-hidden="true" />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-white/20 relative z-10 transition-all duration-300">
        
        {/* App Logo */}
        <div className="w-16 h-16 bg-mintBg text-secondary rounded-2xl flex items-center justify-center mb-6 shadow-inner" aria-hidden="true">
          <Leaf size={32} className="fill-current animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-primary font-sans text-center mb-2">
          EcoTrace
        </h1>
        <p className="text-sm text-textSecondary text-center mb-8 max-w-[280px]">
          Empowering you to measure, understand, and offset your carbon footprint.
        </p>

        {error && (
          <div 
            className="w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-6 flex items-start gap-2"
            role="alert"
          >
            <span className="font-semibold" aria-hidden="true">Error:</span>
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          aria-label="Sign in with Google"
          tabIndex={0}
          className="w-full bg-primary text-white hover:bg-primary/95 active:scale-[0.98] transition-all disabled:opacity-55 disabled:cursor-not-allowed rounded-full py-3.5 px-6 font-semibold flex items-center justify-center gap-3 shadow-md border-2 border-transparent focus-visible:border-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        <p className="text-[10px] text-gray-400 mt-8 text-center max-w-[240px] leading-relaxed">
          By signing in, you agree to EcoTrace's local workspace guidelines and secure data rules.
        </p>
      </div>
    </main>
  );
}
export default Login;
