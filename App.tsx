
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Index';
import { Kanban } from './pages/Kanban';
import { Directory } from './pages/Directory';
import { CompanyDetail } from './pages/CompanyDetail';
import { PeopleDirectory } from './pages/PeopleDirectory';
import { Inbox } from './pages/Inbox';
import { Toolbox } from './pages/Toolbox';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { authService } from './services/auth';

// --- Auth Guard ---
const ProtectedRoute = () => {
    const user = authService.getCurrentUser();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
};

// Fallback component for Work In Progress routes
const WIP = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
    <h2 className="text-2xl font-bold mb-2">Construction Zone</h2>
    <p>The {title} module is coming soon.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
        <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/annuaire" element={<PeopleDirectory />} />
                <Route path="/company/:id" element={<CompanyDetail />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/toolbox" element={<Toolbox />} />
                <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </HashRouter>
  );
};

export default App;
