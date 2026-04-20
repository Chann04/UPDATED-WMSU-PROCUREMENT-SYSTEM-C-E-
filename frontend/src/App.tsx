import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Setup from './pages/Setup';
import Landing from './pages/Landing';
import Help from './pages/Help';
import AdminHelp from './pages/AdminHelp';
import Budget from './pages/Budget';
import Logs from './pages/Logs';
import Colleges from './pages/Colleges';
import AdminRoute from './components/AdminRoute';
import FacultyRoute from './components/FacultyRoute';
import DeptHeadRoute from './components/DeptHeadRoute';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyNewRequest from './pages/FacultyNewRequest';
import FacultyRequestHistory from './pages/FacultyRequestHistory';
import DeptHeadHome from './pages/DeptHeadHome';
import DeptHeadBudget from './pages/DeptHeadBudget';
import DeptHeadRequestHistory from './pages/DeptHeadRequestHistory';
import DeptHeadDepartments from './pages/DeptHeadDepartments';
import DeptHeadHelp from './pages/DeptHeadHelp';
import RegistrationRequests from './pages/RegistrationRequests';
import AdminDashboard from './pages/AdminDashboard';
import RequisitionIntegrityTimeline from './pages/RequisitionIntegrityTimeline';
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/help" element={<Help />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/setup" element={<Setup />} />
          
          {/* Authenticated layout: admin + faculty */}
          <Route element={<Layout />}>
            <Route element={<FacultyRoute />}>
              <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
              <Route path="/faculty/budget" element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="/faculty/new-request" element={<FacultyNewRequest />} />
              <Route path="/faculty/request-history" element={<FacultyRequestHistory />} />
              <Route path="/faculty/requisition-integrity" element={<RequisitionIntegrityTimeline />} />
            </Route>
            <Route element={<DeptHeadRoute />}>
              <Route path="/dept-head" element={<Navigate to="/dept-head/dashboard" replace />} />
              <Route path="/dept-head/dashboard" element={<DeptHeadHome />} />
              <Route path="/dept-head/budget" element={<DeptHeadBudget />} />
              <Route path="/dept-head/departments" element={<DeptHeadDepartments />} />
              <Route
                path="/dept-head/registration-requests"
                element={<RegistrationRequests />}
              />
              <Route path="/dept-head/request-history" element={<DeptHeadRequestHistory />} />
              <Route path="/dept-head/requisition-integrity" element={<RequisitionIntegrityTimeline />} />
              <Route path="/dept-head/help" element={<DeptHeadHelp />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/budget" element={<Budget />} />
              {/* Legacy /users route is retired; user management moved into Colleges details. */}
              <Route path="/users" element={<Navigate to="/colleges" replace />} />
              <Route path="/colleges" element={<Colleges />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/admin-help" element={<AdminHelp />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

