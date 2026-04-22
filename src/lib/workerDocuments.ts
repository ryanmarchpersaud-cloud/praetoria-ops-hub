import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from './auditLog';

const BUCKET = 'worker-documents';

/**
 * Extracts the storage object path from a value that may be:
 * - already a path (e.g. "userId/123.pdf")
 * - a public URL containing "/object/public/worker-documents/<path>"
 * - a signed URL containing "/object/sign/worker-documents/<path>?token=..."
 */
export function extractWorkerDocPath(fileUrl: string): string {
  if (!fileUrl) return '';
  const marker = `/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return fileUrl; // assume it's already a path
  const after = fileUrl.substring(idx + marker.length);
  // strip any query string (signed URL token)
  const q = after.indexOf('?');
  return q === -1 ? after : after.substring(0, q);
}

/** Resolve a stored worker document reference to a fresh signed URL and open it. */
export async function openWorkerDocument(fileUrl: string): Promise<void> {
  const path = extractWorkerDocPath(fileUrl);
  if (!path) throw new Error('No file path');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10); // 10 minutes
  if (error || !data?.signedUrl) {
    logAuditEvent({
      action: 'document.signed_url_generated',
      targetType: 'worker_document',
      targetId: path,
      success: false,
      metadata: { bucket: BUCKET, error: error?.message ?? 'no signed url' },
    });
    throw error ?? new Error('Could not generate download link');
  }
  logAuditEvent({
    action: 'document.signed_url_generated',
    targetType: 'worker_document',
    targetId: path,
    success: true,
    metadata: { bucket: BUCKET, expires_in_seconds: 600 },
  });
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
