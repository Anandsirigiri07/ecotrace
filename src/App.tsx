import React, { ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';

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
      <div className="min-h-screen bg-mintBg flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-[#40916C]/10 text-[#40916C] rounded-full flex items-center justify-center mb-4 animate-bounce">
          <Leaf size={32} />
        </div>
        <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse">
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
    <div className="min-h-screen bg-mintBg flex flex-col transition-all duration-200">
      {/* Navigation bars (desktop top, mobile bottom) */}
      <Navbar 
        userPhoto={profile?.photoURL} 
        displayName={profile?.displayName} 
      />

      {/* Main page content container with padding offsets for navbars */}
      <div className="flex-1 pt-4 pb-20 md:pt-20 md:pb-6">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={
          <div className="min-h-screen bg-mintBg flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 bg-[#40916C]/10 text-[#40916C] rounded-full flex items-center justify-center mb-4 animate-bounce">
              <Leaf size={32} />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse">
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
  );
}
export default App;
