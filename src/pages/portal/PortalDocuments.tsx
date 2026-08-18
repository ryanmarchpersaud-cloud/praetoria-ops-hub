import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { PortalCombinedDocuments } from '@/components/agreements/PortalCombinedDocuments';

import { PortalLayout } from '@/components/PortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

const categoryColor: Record<string, string> = {
  Contract: 'bg-blue-100 text-blue-700 border-blue-200',
  Access: 'bg-purple-100 text-purple-700 border-purple-200',
  Insurance: 'bg-amber-100 text-amber-700 border-amber-200',
  'Site Map': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Price List': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Photo: 'bg-pink-100 text-pink-700 border-pink-200',
  Other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function PortalDocuments() {
  const { toast } = useToast();
  const { data: customer } = useCustomerProfile();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['portal_customer_documents', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  const openDoc = async (doc: any) => {
    const win = window.open('about:blank', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(doc.file_path, 60 * 10);
      if (error) throw error;
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error(`File request failed (${response.status})`);
      const source = await response.blob();
      const blob = new Blob([source], { type: doc.mime_type || source.type || 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      if (win) {
        const safeTitle = String(doc.title || doc.file_name || 'Document').replace(/[&<>"']/g, '');
        win.document.open();
        win.document.write(`<!doctype html><html><head><title>${safeTitle}</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}body{overflow:hidden}</style></head><body><iframe src="${objectUrl}" title="${safeTitle}"></iframe></body></html>`);
        win.document.close();
      } else window.location.assign(objectUrl);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      win?.close();
      toast({ title: 'Cannot open file', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" /> My Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price lists, contracts, insurance certificates, site maps and other documents shared with you.
          </p>
        </div>

        <PortalCombinedDocuments customerId={customer?.id} />



        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No documents have been shared with you yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openDoc(d)}
                        className="text-sm font-semibold text-primary hover:underline text-left truncate"
                      >
                        {d.title}
                      </button>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${categoryColor[d.category] || categoryColor.Other}`}>
                        {d.category}
                      </Badge>
                    </div>
                    {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {d.file_name}
                      {d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : ''}
                      {d.created_at ? ` · ${format(new Date(d.created_at), 'MMM d, yyyy')}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openDoc(d)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
