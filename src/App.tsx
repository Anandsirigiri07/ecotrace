import React, { ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

// Lazy load every page for optimal code-splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LogActivity = lazy(() => import('./pages/LogActivity'));
const Insights = lazy(() => import('./pages/Insights'));
const Profile = lazy(() => import('./pages/Profile'));

// --- Protected Route Helper ---
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-mintBg dark:bg-gray-900 flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
        <div className="w-16 h-16 bg-secondary/10 dark:bg-accent/10 text-secondary dark:text-accent rounded-full flex items-center justify-center mb-4 animate-bounce">
          <Leaf size={32} />
        </div>
        <span className="text-xs font-semibold text-primary dark:text-accent uppercase tracking-wider animate-pulse">
          Loading EcoTrace Workspace...
        </span>
      </div>
    );
  }

  if (!user) {
    // Save previous path to redirect after authentication
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// --- Protected Page Layout (Wraps Nav and Page content) ---
function LayoutWrapper({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-mintBg dark:bg-gray-950 text-textPrimary dark:text-white flex flex-col transition-all duration-200">
      {/* Skip-to-Content link for accessibility keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary dark:bg-gray-800 text-white dark:text-accent px-4 py-2 rounded-xl z-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
      >
        Skip to content
      </a>

      {/* Navigation bars (desktop top, mobile bottom) */}
      <Navbar 
        userPhoto={profile?.photoURL || undefined} 
        displayName={profile?.displayName || undefined} 
      />

      {/* Main page content container with padding offsets for navbars */}
      <main 
        id="main-content"
        tabIndex={-1}
        className="flex-1 pt-4 pb-20 md:pt-20 md:pb-6 focus:outline-none"
        role="main"
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen bg-mintBg dark:bg-gray-900 flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
              <div className="w-16 h-16 bg-secondary/10 dark:bg-accent/10 text-secondary dark:text-accent rounded-full flex items-center justify-center mb-4 animate-bounce">
                <Leaf size={32} />
              </div>
              <span className="text-xs font-semibold text-primary dark:text-accent uppercase tracking-wider animate-pulse">
                Loading EcoTrace...
              </span>
            </div>
          }>
            <Routes>
              {/* Public authentication route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <LayoutWrapper>
                      <Dashboard />
                    </LayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/log" 
                element={
                  <ProtectedRoute>
                    <LayoutWrapper>
                      <LogActivity />
                    </LayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/insights" 
                element={
                  <ProtectedRoute>
                    <LayoutWrapper>
                      <Insights />
                    </LayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <LayoutWrapper>
                      <Profile />
                    </LayoutWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Wildcards and fallbacks */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
export default App;
