import { useEffect, useState } from 'react';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Image as ImageIcon, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { signInspectionPhoto } from '@/hooks/pm/usePmInspections';

export default function OwnerInspections() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['owner_inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_inspections')
        .select('*, pm_inspection_items(*), pm_inspection_photos(*)')
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const insp of data as any[]) {
        for (const p of insp.pm_inspection_photos ?? []) {
          try { out[p.id] = await signInspectionPhoto(p.file_path); } catch {}
        }
      }
      setSigned(out);
    })();
  }, [data]);

  return (
    <OwnerLayout>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-emerald-700" /> Inspections
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data as any[]).length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            No inspections have been shared with you yet.
          </CardContent></Card>
        ) : (
          (data as any[]).map((insp) => (
            <Card key={insp.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {insp.title}
                  <Badge variant="secondary" className="text-[10px]">{insp.inspection_type.replace(/_/g, ' ')}</Badge>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {insp.completed_at ? new Date(insp.completed_at).toLocaleDateString() : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {insp.owner_visible_notes && (
                  <div><p className="text-xs font-medium">Notes</p><p className="text-sm">{insp.owner_visible_notes}</p></div>
                )}
                {insp.summary && <p className="text-sm text-muted-foreground">{insp.summary}</p>}
                {(insp.pm_inspection_items ?? []).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Checklist</p>
                    {insp.pm_inspection_items.map((it: any) => (
                      <div key={it.id} className="text-xs border rounded p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{it.area}</Badge>
                          <span>{it.item_label ?? ''}</span>
                          <Badge variant="secondary" className="text-[10px] ml-auto">{it.condition.replace(/_/g, ' ')}</Badge>
                        </div>
                        {it.notes && <p className="mt-1 text-muted-foreground">{it.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {(insp.pm_inspection_photos ?? []).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {insp.pm_inspection_photos.map((p: any) => (
                      <a key={p.id} href={signed[p.id] ?? '#'} target="_blank" rel="noreferrer" className="block aspect-video bg-muted rounded overflow-hidden">
                        {signed[p.id]
                          ? <img src={signed[p.id]} alt={p.caption ?? p.file_name} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </OwnerLayout>
  );
}
