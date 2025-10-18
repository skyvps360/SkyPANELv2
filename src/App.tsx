import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Containers from "./pages/Containers";
import VPS from "./pages/VPS";
import Billing from "./pages/Billing";
import InvoiceDetail from "./pages/InvoiceDetail";
import TransactionDetail from "./pages/TransactionDetail";
import BillingPaymentSuccess from "./pages/BillingPaymentSuccess";
import BillingPaymentCancel from "./pages/BillingPaymentCancel";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ContainerDetail from "./pages/ContainerDetail";
import VPSDetail from "./pages/VPSDetail";
import AppLayout from "./components/AppLayout";
import ActivityPage from "./pages/Activity";
import ApiDocs from "./pages/ApiDocs";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Admin Route Component (requires authenticated admin role)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/containers" 
        element={
          <ProtectedRoute>
            <Containers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/containers/:id" 
        element={
          <ProtectedRoute>
            <ContainerDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vps" 
        element={
          <ProtectedRoute>
            <VPS />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vps/:id" 
        element={
          <ProtectedRoute>
            <VPSDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/billing" 
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/billing/invoice/:id" 
        element={
          <ProtectedRoute>
            <InvoiceDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/billing/transaction/:id" 
        element={
          <ProtectedRoute>
            <TransactionDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/billing/payment/success" 
        element={
          <ProtectedRoute>
            <BillingPaymentSuccess />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/billing/payment/cancel" 
        element={
          <ProtectedRoute>
            <BillingPaymentCancel />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/support" 
        element={
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/activity" 
        element={
          <ProtectedRoute>
            <ActivityPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } 
      />
      <Route 
        path="/api-docs" 
        element={
          <ProtectedRoute>
            <ApiDocs />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster 
            position="bottom-right"
            richColors
            closeButton
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
