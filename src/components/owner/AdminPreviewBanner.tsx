import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function useIsOwnerAdminPreview() {
  const [params] = useSearchParams();
  return params.get('adminPreview') === '1';
}

export function AdminPreviewBanner() {
  const preview = useIsOwnerAdminPreview();
  if (!preview) return null;
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        <b>Admin Preview</b> — You are viewing this Property Owner Portal as Praetoria Admin. Read-only.
      </span>
    </div>
  );
}
