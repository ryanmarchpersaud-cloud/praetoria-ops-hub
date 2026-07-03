import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FolderOpen, FileText, Download, Archive, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePmDocuments, signPmDocument, useArchivePmDocument,
  PM_DOC_TYPES, PM_DOC_VISIBILITIES, PmDocumentVisibility,
} from '@/hooks/pm/usePmDocuments';
import { PMDocumentUploadDialog } from '@/components/property-management/PMDocumentUploadDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ANY = '__any__';

function useProperties() {
  return useQuery({
    queryKey: ['pm_properties_min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_managed_properties')
        .select('id, property_name')
        .order('property_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useOwners() {
  return useQuery({
    queryKey: ['pm_owners_min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_property_owners')
        .select('id, owner_name')
        .order('owner_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useTenants() {
  return useQuery({
    queryKey: ['pm_tenants_min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_tenants')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function PMDocumentsList() {
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState<string>(ANY);
  const [ownerId, setOwnerId] = useState<string>(ANY);
  const [tenantId, setTenantId] = useState<string>(ANY);
  const [docType, setDocType] = useState<string>(ANY);
  const [visibility, setVisibility] = useState<string>(ANY);

  const filters = useMemo(() => ({
    search: search || undefined,
    property_id: propertyId !== ANY ? propertyId : undefined,
    owner_id: ownerId !== ANY ? ownerId : undefined,
    tenant_id: tenantId !== ANY ? tenantId : undefined,
    document_type: docType !== ANY ? docType : undefined,
    visibility: visibility !== ANY ? (visibility as PmDocumentVisibility) : undefined,
  }), [search, propertyId, ownerId, tenantId, docType, visibility]);

  const { data = [], isLoading } = usePmDocuments(filters);
  const archive = useArchivePmDocument();
  const properties = useProperties();
  const owners = useOwners();
  const tenants = useTenants();
  const [busy, setBusy] = useState<string | null>(null);

  const openDoc = async (id: string, path: string) => {
    setBusy(id);
    try {
      const url = await signPmDocument(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) { toast.error(e.message ?? 'Could not open'); }
    finally { setBusy(null); }
  };

  const clear = () => {
    setSearch(''); setPropertyId(ANY); setOwnerId(ANY); setTenantId(ANY);
    setDocType(ANY); setVisibility(ANY);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-emerald-700" /> Document Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Central library for property management documents. Set visibility per file to control what tenants and owners can see.
          </p>
        </div>
        <PMDocumentUploadDialog />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search title, description, file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All properties</SelectItem>
                {(properties.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All owners</SelectItem>
                {(owners.data ?? []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.owner_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Tenant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All tenants</SelectItem>
                {(tenants.data ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All types</SelectItem>
                {PM_DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All visibility</SelectItem>
                {PM_DOC_VISIBILITIES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No documents match these filters.</p>
          ) : (
            <div className="divide-y">
              {data.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{d.title}</p>
                      <Badge variant="outline" className="text-[10px]">{d.visibility.replace(/_/g, ' ')}</Badge>
                      {d.document_type && (
                        <Badge variant="secondary" className="text-[10px]">{d.document_type.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {d.file_name} · uploaded {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => openDoc(d.id, d.file_path)}>
                    <Download className="h-4 w-4 mr-1" />
                    {busy === d.id ? 'Opening…' : 'Open'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try { await archive.mutateAsync(d.id); toast.success('Archived'); }
                      catch (e: any) { toast.error(e.message ?? 'Failed'); }
                    }}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
