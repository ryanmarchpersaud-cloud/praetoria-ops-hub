import { PMCalendarView } from '@/components/pm/PMCalendarView';

export default function PMCalendarPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PMCalendarView
        variant="admin"
        heading="Property Management Calendar"
        subheading="Upcoming showings, inspections, move-ins, move-outs, renewals, tasks, owner approvals and work orders."
      />
    </div>
  );
}
