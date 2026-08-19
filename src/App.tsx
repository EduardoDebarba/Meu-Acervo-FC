import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Collection } from './pages/Collection';
import { ShirtForm } from './pages/ShirtForm';
import { ShirtDetails } from './pages/ShirtDetails';
import { Wishlist } from './pages/Wishlist';
import { WishlistForm } from './pages/WishlistForm';
import { ThemeProvider } from './components/ThemeProvider';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="collection" element={<Collection />} />
                <Route path="collection/new" element={<ShirtForm />} />
                <Route path="collection/:id" element={<ShirtDetails />} />
                <Route path="collection/:id/edit" element={<ShirtForm />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="wishlist/new" element={<WishlistForm />} />
                <Route path="wishlist/:id/edit" element={<WishlistForm />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
