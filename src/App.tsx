import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { Layout } from './shell/Layout';
import { TasksPage } from './features/tasks/TasksPage';
import { ReviewsPage } from './features/reviews/ReviewsPage';
import { ReviewFlowPage } from './features/reviews/ReviewFlowPage';
import { RequestsPage } from './features/requests/RequestsPage';
import { InboxPage } from './features/requests/InboxPage';
import { CategoriesPage } from './features/requests/CategoriesPage';
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
        <Route path="/reviews" element={can('Workflow.View') ? <ReviewsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/review-flow" element={can('Workflow.Configure') ? <ReviewFlowPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/requests" element={can('Requests.Submit') ? <RequestsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/requests/inbox" element={can('Requests.Handle') ? <InboxPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/request-categories" element={can('Requests.Manage') ? <CategoriesPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Route>
    </Routes>
  );
}
