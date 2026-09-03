// Phase 1D — labelled Prae launcher. Opens the right-side command panel
// without navigating away from the current screen.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PraePanel from './PraePanel';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { cn } from '@/lib/utils';

export default function PraeLauncher({
  context = 'Admin Portal',
  className,
  variant = 'ghost',
}: {
  context?: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open Prae assistant"
        title="Prae — Praetoria Business Brain"
        className={cn('gap-1.5 px-2', className)}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary">
          <img src={praetoriaLogo} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
        </span>
        <span className="text-xs font-semibold">Prae</span>
      </Button>
      <PraePanel open={open} onOpenChange={setOpen} context={context} />
    </>
  );
}
