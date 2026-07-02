import { Card, CardContent } from '@/components/ui/card';

export default function MoveOuts() {
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Move-Out Checklists</h2>
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Coming in Phase 6B</p>
          <p>Notice tracking, inspections, key returns, damage notes, deposit review.</p>
        </CardContent>
      </Card>
    </div>
  );
}
