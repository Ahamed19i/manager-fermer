import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import { Toaster } from './components/ui/sonner';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Production = React.lazy(() => import('./pages/Production'));
const Sales = React.lazy(() => import('./pages/Sales'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Logs = React.lazy(() => import('./pages/Logs'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Stock = React.lazy(() => import('./pages/Stock'));
const Clients = React.lazy(() => import('./pages/Clients'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-opacity-20"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <React.Suspense fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </React.Suspense>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
