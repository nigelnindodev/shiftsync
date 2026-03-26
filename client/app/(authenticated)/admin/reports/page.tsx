// TODO: Replace hardcoded fairness data with API data when admin endpoints are built
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Schedule Fairness Analytics</h1>
      <p className="text-muted-foreground mb-8">
        Distribution of shifts and hours across staff
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Hours Distribution</CardTitle>
            <CardDescription>
              Hours assigned per staff member this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'John Bartender', hours: 40, desired: 40 },
                { name: 'Sarah Server', hours: 32, desired: 40 },
                { name: 'Maria Line Cook', hours: 36, desired: 40 },
                { name: 'David Bartender', hours: 24, desired: 40 },
                { name: 'Emma Host', hours: 28, desired: 40 },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sm w-36 truncate">{s.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(s.hours / s.desired) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {s.hours}/{s.desired}h
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">
              Premium Shift Distribution
            </CardTitle>
            <CardDescription>
              Fri/Sat evening shifts — fairness score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Sarah Server', count: 2, badge: 'Over-allocated' },
                { name: 'Lisa Server', count: 1, badge: 'Balanced' },
                { name: 'Emma Host', count: 0, badge: 'Under-allocated' },
                {
                  name: 'Alexandra Server',
                  count: 0,
                  badge: 'Under-allocated',
                },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-sm">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.count} shifts
                    </span>
                    <Badge
                      variant={s.badge === 'Balanced' ? 'secondary' : 'outline'}
                      className="text-[10px]"
                    >
                      {s.badge}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
