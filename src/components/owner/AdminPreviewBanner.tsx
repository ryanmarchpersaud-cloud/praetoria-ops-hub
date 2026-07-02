import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { useOwnerRecord } from '@/hooks/useOwnerPortal';

export function useIsOwnerAdminPreview() {
  const [params] = useSearchParams();
  return !!params.get('adminPreview');
}

export function AdminPreviewBanner() {
  const scope = useOwnerScope();
  const { data: owner } = useOwnerRecord();
  if (!scope.isPreview) return null;
  const invalid = !scope.ownerId;
  return (
    <div className={`text-xs px-4 py-2 flex items-center gap-2 border-b ${invalid ? 'bg-red-100 border-red-300 text-red-900' : 'bg-amber-100 border-amber-300 text-amber-900'}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">
        <b>Admin Preview</b>
        {invalid ? (
          <> — Missing owner id. Open preview from a specific owner record (Property Management → Owners → owner → Preview Owner Portal).</>
        ) : (
          <> — You are viewing this portal as {owner?.owner_name ?? owner?.company_name ?? 'the selected owner'}. Data mirrors what they see. Read-only.</>
        )}
      </span>
    </div>
  );
}
