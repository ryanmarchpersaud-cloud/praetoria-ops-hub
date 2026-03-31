import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllWorkerDocuments, useAllCertifications } from '@/hooks/useHRData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Award, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function HRDocumentsPage() {
  const { data: employees = [] } = useEmployees();
  const { data: docs = [] } = useAllWorkerDocuments();
  const { data: certs = [] } = useAllCertifications();

  const getEmpName = (userId: string) => employees.find(e => e.user_id === userId)?.full_name || 'Unknown';

  const today = new Date();
  const expiringCerts = certs.filter((c: any) => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(new Date(c.expiry_date), today);
    return days >= 0 && days <= 30;
  });
  const expiredCerts = certs.filter((c: any) => c.expiry_date && new Date(c.expiry_date) < today && c.status !== 'revoked');
  const pendingCerts = certs.filter((c: any) => c.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents & Certifications</h1>
        <p className="text-sm text-muted-foreground">Worker documents, certificates & expiry tracking</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div><p className="text-xl font-bold">{docs.length}</p><p className="text-[10px] text-muted-foreground">Documents</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-5 w-5 text-blue-600" />
            <div><p className="text-xl font-bold">{certs.length}</p><p className="text-[10px] text-muted-foreground">Certifications</p></div>
          </CardContent>
        </Card>
        <Card className={pendingCerts.length > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-5 w-5 text-amber-600" />
            <div><p className="text-xl font-bold">{pendingCerts.length}</p><p className="text-[10px] text-muted-foreground">Pending Review</p></div>
          </CardContent>
        </Card>
        <Card className={expiredCerts.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div><p className="text-xl font-bold">{expiredCerts.length}</p><p className="text-[10px] text-muted-foreground">Expired</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="certs">
        <TabsList>
          <TabsTrigger value="certs">Certifications ({certs.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringCerts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="certs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {certs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No certifications on file.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Issuer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.map((c: any) => {
                      const isExpired = c.expiry_date && new Date(c.expiry_date) < today;
                      const isExpiring = c.expiry_date && !isExpired && differenceInDays(new Date(c.expiry_date), today) <= 30;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link to={`/employees/${c.user_id}`} className="text-sm font-medium text-primary hover:underline">
                              {getEmpName(c.user_id)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{c.cert_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.issuer || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'valid' ? 'default' : c.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.expiry_date ? (
                              <span className={`text-sm ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                {format(new Date(c.expiry_date), 'MMM d, yyyy')}
                                {isExpired && ' (Expired)'}
                                {isExpiring && ` (${differenceInDays(new Date(c.expiry_date), today)}d)`}
                              </span>
                            ) : <span className="text-sm text-muted-foreground">No expiry</span>}
                          </TableCell>
                          <TableCell>
                            {c.file_url ? (
                              <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View</a>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {expiringCerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No certifications expiring within 30 days 🎉</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringCerts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={`/employees/${c.user_id}`} className="text-sm font-medium text-primary hover:underline">
                            {getEmpName(c.user_id)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{c.cert_name}</TableCell>
                        <TableCell className="text-sm">{format(new Date(c.expiry_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600">
                            {differenceInDays(new Date(c.expiry_date), today)}d left
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No worker documents on file.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Link to={`/employees/${d.user_id}`} className="text-sm font-medium text-primary hover:underline">
                            {getEmpName(d.user_id)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{d.document_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{d.document_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
