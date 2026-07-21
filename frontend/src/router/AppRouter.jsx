import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'

// Layouts
import PageLayout from '@/components/common/PageLayout'
import AdminLayout from '@/components/common/AdminLayout'

// Public Pages
import Home from '@/pages/public/Home'
import TripDetail from '@/pages/public/TripDetail'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

// Customer Protected Pages
import BookTicket from '@/pages/customer/BookTicket'
import InvoiceHistory from '@/pages/customer/InvoiceHistory'
import Profile from '@/pages/customer/Profile'

// Staff Protected Pages
import ManageInvoice from '@/pages/staff/ManageInvoice'
import Statistics from '@/pages/staff/Statistics'
import ViewTrips from '@/pages/staff/ViewTrips'
import ViewRoutes from '@/pages/staff/ViewRoutes'
import ViewVehicles from '@/pages/staff/ViewVehicles'

// Admin Protected Pages
import Dashboard from '@/pages/admin/Dashboard'
import ManageUsers from '@/pages/admin/ManageUsers'
import ManageRoutes from '@/pages/admin/ManageRoutes'
import ManageTrips from '@/pages/admin/ManageTrips'
import ManageVehicles from '@/pages/admin/ManageVehicles'

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes with PageLayout */}
      <Route
        path="/"
        element={
          <PageLayout>
            <Home />
          </PageLayout>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <PageLayout>
            <TripDetail />
          </PageLayout>
        }
      />
      <Route
        path="/login"
        element={
          <PageLayout>
            <Login />
          </PageLayout>
        }
      />
      <Route
        path="/register"
        element={
          <PageLayout>
            <Register />
          </PageLayout>
        }
      />

      {/* Customer Routes (Protected) */}
      <Route
        path="/customer/book"
        element={
          <PrivateRoute allowedRoles={['customer', 'staff']}>
            <PageLayout>
              <BookTicket />
            </PageLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/customer/invoices"
        element={
          <PrivateRoute allowedRoles={['customer']}>
            <PageLayout>
              <InvoiceHistory />
            </PageLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/customer/profile"
        element={
          <PrivateRoute allowedRoles={['customer', 'staff', 'admin']}>
            <PageLayout>
              <Profile />
            </PageLayout>
          </PrivateRoute>
        }
      />

      {/* Staff & Admin Shared Routes */}
      <Route
        path="/staff/invoices"
        element={
          <PrivateRoute allowedRoles={['staff', 'admin']}>
            <AdminLayout>
              <ManageInvoice />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/stats"
        element={
          <PrivateRoute allowedRoles={['staff', 'admin']}>
            <AdminLayout>
              <Statistics />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/trips"
        element={
          <PrivateRoute allowedRoles={['staff', 'admin']}>
            <AdminLayout>
              <ViewTrips />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/routes"
        element={
          <PrivateRoute allowedRoles={['staff', 'admin']}>
            <AdminLayout>
              <ViewRoutes />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/vehicles"
        element={
          <PrivateRoute allowedRoles={['staff', 'admin']}>
            <AdminLayout>
              <ViewVehicles />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      {/* Admin Exclusive Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout>
              <ManageUsers />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/routes"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout>
              <ManageRoutes />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/trips"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout>
              <ManageTrips />
            </AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/vehicles"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout>
              <ManageVehicles />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      {/* Fallback to Home */}
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
