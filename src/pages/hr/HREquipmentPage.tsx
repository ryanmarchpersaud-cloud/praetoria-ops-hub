import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllEquipment } from '@/hooks/useHRData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardHat, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const conditionColors: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-700',
  fair: 'bg-amber-500/10 text-amber-700',
  damaged: 'bg-destructive/10 text-destructive',
  returned: 'bg-muted text-muted-foreground',
  lost: 'bg-destructive/10 text-destructive',
};

export default function HREquipmentPage() {
  const { data: employees = [] } = useEmployees();
  const { data: items = [] } = useAllEquipment();

  const getEmpName = (userId: string) => employees.find(e => e.user_id === userId)?.full_name || 'Unknown';

  const issued = items.filter((i: any) => i.condition !== 'returned');
  const replacementRequested = items.filter((i: any) => i.replacement_requested);
  const damaged = items.filter((i: any) => i.condition === 'damaged' || i.condition === 'lost');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">PPE & Equipment</h1>
        <p className="text-sm text-muted-foreground">Track equipment issuance, condition & replacements</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <HardHat className="h-5 w-5 text-primary" />
            <div><p className="text-xl font-bold">{issued.length}</p><p className="text-[10px] text-muted-foreground">Active Items</p></div>
          </CardContent>
        </Card>
        <Card className={replacementRequested.length > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            <div><p className="text-xl font-bold">{replacementRequested.length}</p><p className="text-[10px] text-muted-foreground">Replacement Requested</p></div>
          </CardContent>
        </Card>
        <Card className={damaged.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div><p className="text-xl font-bold">{damaged.length}</p><p className="text-[10px] text-muted-foreground">Damaged / Lost</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div><p className="text-xl font-bold">{items.length - issued.length}</p><p className="text-[10px] text-muted-foreground">Returned</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({issued.length})</TabsTrigger>
          <TabsTrigger value="replacements">Replacements ({replacementRequested.length})</TabsTrigger>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
        </TabsList>

        {['active', 'replacements', 'all'].map(tab => {
          const list = tab === 'active' ? issued : tab === 'replacements' ? replacementRequested : items;
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {list.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No items.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Serial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link to={`/employees/${item.user_id}`} className="text-sm font-medium text-primary hover:underline">
                                {getEmpName(item.user_id)}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">{item.item_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] capitalize ${conditionColors[item.condition] || ''}`}>
                                {item.condition}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.issued_date ? format(new Date(item.issued_date), 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.serial_number || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
