import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import TeamDashboard from './TeamDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/team/:teamCode"   element={<TeamDashboard />} />
        <Route path="*"                 element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
