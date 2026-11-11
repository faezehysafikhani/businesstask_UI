import { useEffect, useState } from 'react';
import { membershipApi } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';

// A line at the top when the plan is ending, expired or near a limit - only for those who may see the plan.
export function MembershipBanner() {
  const { can } = useAuth();
  const [warnings, setWarnings] = useState<string[]>([]);
  useEffect(() => { if (can('Membership.View')) membershipApi.get().then((m) => setWarnings(m.warnings)).catch(() => {}); }, [can]);
  if (warnings.length === 0) return null;
  return <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-sm text-amber-900">{warnings.join(' · ')}</div>;
}
