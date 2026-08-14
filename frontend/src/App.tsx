import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import Layout from './components/layout/Layout';
import { ToastProvider } from './components/Toast';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Orders = React.lazy(() => import('./pages/Orders'));
const OrderDetails = React.lazy(() => import('./pages/OrderDetails'));
const NewOrder = React.lazy(() => import('./pages/NewOrder'));
const Customers = React.lazy(() => import('./pages/Customers'));
const CustomerProfile = React.lazy(() => import('./pages/CustomerProfile'));
const GroupProfile = React.lazy(() => import('./pages/GroupProfile'));
const Employees = React.lazy(() => import('./pages/Employees'));
const EmployeeProfile = React.lazy(() => import('./pages/EmployeeProfile'));
const RateMaster = React.lazy(() => import('./pages/RateMaster'));
const Stock = React.lazy(() => import('./pages/Stock'));
const FabricDetails = React.lazy(() => import('./pages/FabricDetails'));
const Accounts = React.lazy(() => import('./pages/Accounts'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Login = React.lazy(() => import('./pages/Login'));
const NewFabric = React.lazy(() => import('./pages/NewFabric'));
const PrintPreview = React.lazy(() => import('./pages/PrintPreview'));
const PublicShare = React.lazy(() => import('./pages/PublicShare'));
const CustomerRegistration = React.lazy(() => import('./pages/CustomerRegistration'));
const SystemLogs = React.lazy(() => import('./pages/SystemLogs'));
const MobileScanner = React.lazy(() => import('./pages/MobileScanner'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = sessionStorage.getItem('token');
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="hingu-theme">
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/scan" element={<ProtectedRoute><MobileScanner /></ProtectedRoute>} />
            <Route path="/print-preview" element={<ProtectedRoute><PrintPreview /></ProtectedRoute>} />
            <Route path="/share/:token" element={<PublicShare />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/new" element={<NewOrder />} />
              <Route path="orders/edit/:id" element={<NewOrder />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/new" element={<CustomerRegistration />} />
              <Route path="customers/edit/:id" element={<CustomerRegistration />} />
              <Route path="customers/group/:id" element={<GroupProfile />} />
              <Route path="customers/:id" element={<CustomerProfile />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/:id" element={<EmployeeProfile />} />
              <Route path="ratemaster" element={<RateMaster />} />
              <Route path="measurements" element={<Navigate to="/customers" replace />} />
              <Route path="stock" element={<Stock />} />
              <Route path="stock/new" element={<NewFabric />} />
              <Route path="stock/edit/:id" element={<NewFabric />} />
              <Route path="stock/:id" element={<FabricDetails />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="system-logs" element={<SystemLogs />} />
              
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
