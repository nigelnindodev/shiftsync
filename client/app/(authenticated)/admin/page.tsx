// TODO: Replace hardcoded stats with API data when admin endpoints are built
export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Corporate oversight across all locations
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 card-shadow">
          <p className="text-sm font-medium text-muted-foreground">
            Total Staff Scheduled
          </p>
          <p className="text-3xl font-bold mt-2">42</p>
          <p className="text-xs text-muted-foreground mt-1">This week</p>
        </div>
        <div className="rounded-lg border bg-card p-6 card-shadow">
          <p className="text-sm font-medium text-muted-foreground">
            Projected Overtime
          </p>
          <p className="text-3xl font-bold mt-2 text-accent">18h</p>
          <p className="text-xs text-muted-foreground mt-1">
            3 employees at risk
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 card-shadow">
          <p className="text-sm font-medium text-muted-foreground">
            Pending Approvals
          </p>
          <p className="text-3xl font-bold mt-2">5</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across all locations
          </p>
        </div>
      </div>
    </div>
  );
}
