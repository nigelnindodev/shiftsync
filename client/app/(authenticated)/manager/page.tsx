import { redirect } from 'next/navigation';

export default function ManagerIndexPage() {
  // Redirect to shifts list — the manager's primary landing page
  redirect('/manager/shifts');
}
