import { PMStaffLayout } from '@/components/pm-staff/PMStaffLayout';
import { PMCalendarView } from '@/components/pm/PMCalendarView';

export default function PMStaffCalendar() {
  return (
    <PMStaffLayout>
      <div className="p-4 pb-24 max-w-3xl mx-auto">
        <PMCalendarView
          variant="staff"
          heading="My Schedule"
          subheading="Your assigned showings, inspections, move-ins, move-outs, renewals and tasks."
        />
      </div>
    </PMStaffLayout>
  );
}
