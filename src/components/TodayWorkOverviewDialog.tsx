import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface TodayWorkOverviewDialogProps {
  visitCount: number;
  scheduleRoute: string;
  storageKey: string;
}

export function TodayWorkOverviewDialog({ visitCount, scheduleRoute, storageKey }: TodayWorkOverviewDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (visitCount <= 0) return;
    const todayKey = `${storageKey}_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(todayKey)) return;
    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(todayKey, '1');
    }, 800);
    return () => clearTimeout(timer);
  }, [visitCount, storageKey]);

  if (visitCount <= 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            👋 Today's work overview
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            You're assigned to {visitCount} visit{visitCount !== 1 ? 's' : ''} today. Tap to view your schedule.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button size="sm" onClick={() => { setOpen(false); navigate(scheduleRoute); }}>
            View
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
