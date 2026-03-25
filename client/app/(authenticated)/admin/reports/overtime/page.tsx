import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function OvertimePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Overtime Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Projected overtime costs and risk analysis
      </p>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Weekly Hours (All Staff)
            </p>
            <p className="text-3xl font-bold">312h</p>
            <p className="text-xs text-muted-foreground mt-1">
              of 360h budgeted
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overtime Hours</p>
            <p className="text-3xl font-bold text-accent">18h</p>
            <p className="text-xs text-muted-foreground mt-1">
              ~$540 estimated cost
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">At-Risk Employees</p>
            <p className="text-3xl font-bold">3</p>
            <p className="text-xs text-muted-foreground mt-1">
              approaching 40h
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">
            Employees Approaching Overtime
          </CardTitle>
          <CardDescription>
            Staff at or above 35 hours this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: 'John Bartender',
                hours: 40,
                shift: 'Mon-Fri 09:00-17:00',
                status: 'At limit',
              },
              {
                name: 'Carlos Line Cook',
                hours: 36,
                shift: 'Mon-Thu + Sat',
                status: 'Warning',
              },
              {
                name: 'Maria Line Cook',
                hours: 35,
                shift: 'Mon-Fri 08:00-16:00',
                status: 'Warning',
              },
            ].map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.shift}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">{e.hours}h</span>
                  <Badge
                    variant={
                      e.status === 'At limit' ? 'destructive' : 'outline'
                    }
                    className="gap-1"
                  >
                    {e.status === 'At limit' && (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {e.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
