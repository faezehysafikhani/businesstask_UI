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
import { TemplatesPage } from './features/templates/TemplatesPage';
import { TimesheetPage } from './features/time/TimesheetPage';
import { WorkloadPage } from './features/time/WorkloadPage';
import { AutomationPage } from './features/automation/AutomationPage';
import { MeetingsPage } from './features/meetings/MeetingsPage';
import { WebhooksPage } from './features/admin/WebhooksPage';
import { MembershipPage } from './features/admin/MembershipPage';
import { SecurityPage } from './features/security/SecurityPage';
import { UsersPage } from './features/security/UsersPage';
import { MyReportsPage } from './features/integrations/MyReportsPage';
import { ImportPage } from './features/integrations/ImportPage';
import { SmsSettingsPage } from './features/integrations/SmsSettingsPage';
import { LdapPage } from './features/integrations/LdapPage';
import { StatusesPage } from './features/tasks/StatusesPage';
import { OrgChartPage } from './features/org/OrgChartPage';
import { OrgNodePage } from './features/org/OrgNodePage';
import { OrgPeoplePage } from './features/org/OrgPeoplePage';
import { ORG_PERMISSIONS } from './api/org';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectPage } from './features/projects/ProjectPage';
import { PROJECT_PERMISSIONS } from './api/projects';

export function App() {
  const { me, loading, can } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">...</div>;
  if (!me) return <LoginPage />;
  const anyOrg = ORG_PERMISSIONS.some(can);
  const anyProject = PROJECT_PERMISSIONS.some(can);
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
        <Route path="/templates" element={can('Tasks.View') ? <TemplatesPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/timesheet" element={can('Timesheets.Log') ? <TimesheetPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/workload" element={can('Timesheets.ViewAll') ? <WorkloadPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/timesheet-flow" element={can('Workflow.Configure') ? <ReviewFlowPage subject="Timesheet" /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/automation" element={can('Automation.Manage') ? <AutomationPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/meetings" element={can('Meetings.View') ? <MeetingsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/webhooks" element={can('Webhooks.Manage') ? <WebhooksPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/membership" element={can('Membership.View') ? <MembershipPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/settings/users" element={can('users.view') ? <UsersPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/my-reports" element={can('Tasks.View') ? <MyReportsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/import" element={can('Tasks.Create') ? <ImportPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/sms" element={can('sms_settings.view') ? <SmsSettingsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/settings/ldap" element={can('ldap_settings.view') ? <LdapPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/organization" element={anyOrg ? <OrgChartPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/organization/nodes/:id" element={anyOrg ? <OrgNodePage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/organization/people" element={anyOrg ? <OrgPeoplePage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/projects" element={anyProject ? <ProjectsPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="/projects/:id" element={anyProject ? <ProjectPage /> : <p>دسترسی ندارید.</p>} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Route>
    </Routes>
  );
}
