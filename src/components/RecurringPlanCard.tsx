import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CalendarClock, RefreshCw } from 'lucide-react';

const SERVICE_FREQUENCIES = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'on-snowfall', label: 'On Snowfall Trigger' },
  { value: 'custom-seasonal', label: 'Custom Seasonal Plan' },
];

interface RecurringPlanCardProps {
  form: any;
  set: (key: string, value: any) => void;
  onGenerateVisits?: () => void;
  isGenerating?: boolean;
}

export function RecurringPlanCard({ form, set, onGenerateVisits, isGenerating }: RecurringPlanCardProps) {
  const freq = form.service_frequency || 'one-time';
  const isRecurring = freq !== 'one-time';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" /> Service Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Frequency</Label>
          <select
            value={freq}
            onChange={e => set('service_frequency', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
          >
            {SERVICE_FREQUENCIES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {isRecurring && (
          <>
            <div>
              <Label className="text-xs">Season Name</Label>
              <Input
                value={form.season_name || ''}
                onChange={e => set('season_name', e.target.value)}
                placeholder="e.g. Winter 2025-2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Contract Start</Label>
                <Input
                  type="date"
                  value={form.contract_start_date || ''}
                  onChange={e => set('contract_start_date', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Contract End</Label>
                <Input
                  type="date"
                  value={form.contract_end_date || ''}
                  onChange={e => set('contract_end_date', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min. Included Visits</Label>
                <Input
                  type="number"
                  value={form.minimum_included_visits || ''}
                  onChange={e => set('minimum_included_visits', parseInt(e.target.value) || null)}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <Label className="text-xs">Extra Visit Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.additional_visit_rate || ''}
                  onChange={e => set('additional_visit_rate', parseFloat(e.target.value) || null)}
                  placeholder="e.g. 85.00"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Service Instructions</Label>
              <Textarea
                value={form.service_instructions || ''}
                onChange={e => set('service_instructions', e.target.value)}
                rows={2}
                placeholder="Standing instructions for crew on each visit..."
              />
            </div>

            {onGenerateVisits && form.contract_start_date && form.contract_end_date && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onGenerateVisits}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Planned Visits'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
