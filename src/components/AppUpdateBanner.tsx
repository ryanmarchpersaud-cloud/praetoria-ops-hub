import { useAppUpdate } from '@/hooks/useAppUpdate';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, AlertTriangle } from 'lucide-react';

export function AppUpdateBanner() {
  const { showBanner, isCritical, storeUrl, releaseNotes, dismiss } = useAppUpdate();

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] ${isCritical ? '' : ''}`}>
      <Alert
        variant={isCritical ? 'destructive' : 'default'}
        className={`rounded-none border-x-0 border-t-0 ${
          isCritical
            ? 'bg-destructive/95 text-destructive-foreground'
            : 'bg-primary/95 text-primary-foreground border-primary/50'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isCritical ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <Download className="h-4 w-4 shrink-0" />
            )}
            <AlertDescription className={isCritical ? 'text-destructive-foreground' : 'text-primary-foreground'}>
              <span className="font-semibold">
                {isCritical ? 'Critical update required.' : 'A new version is available.'}
              </span>
              {releaseNotes && (
                <span className="ml-1 text-xs opacity-80">{releaseNotes}</span>
              )}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={isCritical ? 'outline' : 'secondary'}
              className="h-7 text-xs gap-1"
              onClick={() => window.open(storeUrl, '_blank')}
            >
              <Download className="h-3 w-3" />
              Update
            </Button>
            {!isCritical && (
              <button
                onClick={dismiss}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}
