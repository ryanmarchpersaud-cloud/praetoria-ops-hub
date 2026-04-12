import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSignature, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMyAgreements } from '@/hooks/useAgreements';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', sent: 'bg-blue-100 text-blue-700', viewed: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700', declined: 'bg-destructive/10 text-destructive',
};

export default function SubcontractorAgreementsPage() {
  const { user } = useAuth();
  const { data: agreements = [], isLoading } = useMyAgreements(user?.id, 'subcontractor');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary" /> My Agreements</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Agreements ({agreements.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : agreements.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No agreements yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Agreement</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {agreements.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-sm">{a.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge className={statusColors[a.status] || ''}>{a.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {(a.status === 'sent' || a.status === 'viewed') && (
                        <Button size="sm" variant="default" onClick={() => window.open(`/sign/${a.signing_token}`, '_blank')}>
                          <FileSignature className="h-3.5 w-3.5 mr-1" /> Sign
                        </Button>
                      )}
                      {a.status === 'signed' && (
                        <Button size="sm" variant="outline" onClick={() => window.open(`/sign/${a.signing_token}`, '_blank')}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
