import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TimeMachine from './pages/TimeMachine';
import Configurations from './pages/Configurations';
import Baselines from './pages/Baselines';
import Changes from './pages/Changes';
import Compare from './pages/Compare';
import Rollback from './pages/Rollback';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="time-machine" element={<TimeMachine />} />
        <Route path="configurations" element={<Configurations />} />
        <Route path="baselines" element={<Baselines />} />
        <Route path="changes" element={<Changes />} />
        <Route path="compare" element={<Compare />} />
        <Route path="rollback" element={<Rollback />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
