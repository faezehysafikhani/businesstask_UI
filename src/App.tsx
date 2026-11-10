import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { Layout } from './shell/Layout';
import { TasksPage } from './features/tasks/TasksPage';
import { StatusesPage } from './features/tasks/StatusesPage';

export function App() {
  const { me, loading, can } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">...</div>;
  if (!me) return <LoginPage />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/tasks" element={can('Tasks.View') ? <TasksPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/statuses" element={can('Tasks.ManageStatuses') ? <StatusesPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Route>
    </Routes>
  );
}
