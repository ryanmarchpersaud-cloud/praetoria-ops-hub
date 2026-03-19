import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Route, MapPin, Plus, Pencil, Trash2, Navigation, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type RouteSettings = {
  id?: string;
  optimization_priority: string;
  planning_mode: string;
  default_travel_buffer: number;
  start_location: string;
  return_to_base: boolean;
  avg_travel_speed_kmh: number;
  service_time_weight: number;
};

type Territory = {
  id: string;
  name: string;
  description: string;
  color: string;
  postal_codes: string[];
  cities: string[];
  is_active: boolean;
  sort_order: number;
};

const RS_DEFAULTS: RouteSettings = {
  optimization_priority: 'clustered_area', planning_mode: 'manual',
  default_travel_buffer: 15, start_location: '', return_to_base: true,
  avg_travel_speed_kmh: 40, service_time_weight: 1.0,
};

const EMPTY_TERRITORY: Omit<Territory, 'id'> = {
  name: '', description: '', color: '#3b82f6', postal_codes: [], cities: [], is_active: true, sort_order: 0,
};

export default function RouteOptimizationPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RouteSettings>(RS_DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [editTerritory, setEditTerritory] = useState<Partial<Territory> & typeof EMPTY_TERRITORY>(EMPTY_TERRITORY);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['route_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('route_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as RouteSettings | null;
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['service_territories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_territories').select('*').order('sort_order');
      if (error) throw error;
      return data as Territory[];
    },
  });

  useEffect(() => { if (settings) setForm({ ...RS_DEFAULTS, ...settings }); }, [settings]);

  const set = (key: keyof RouteSettings, val: any) => { setForm(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form;
      if (settings?.id) {
        const { error } = await supabase.from('route_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('route_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Route settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['route_settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const saveTerritoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: editTerritory.name,
        description: editTerritory.description,
        color: editTerritory.color,
        postal_codes: editTerritory.postal_codes,
        cities: editTerritory.cities,
        is_active: editTerritory.is_active,
        sort_order: editTerritory.sort_order,
      };
      if (editId) {
        const { error } = await supabase.from('service_territories').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_territories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? 'Territory updated' : 'Territory created');
      setTerritoryOpen(false);
      setEditId(null);
      setEditTerritory(EMPTY_TERRITORY);
      queryClient.invalidateQueries({ queryKey: ['service_territories'] });
    },
    onError: () => toast.error('Failed to save territory'),
  });

  const deleteTerritoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_territories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Territory deleted'); queryClient.invalidateQueries({ queryKey: ['service_territories'] }); },
  });

  const openEdit = (t: Territory) => {
    setEditTerritory({ ...t });
    setEditId(t.id);
    setTerritoryOpen(true);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Route Optimization</h1>
            <p className="text-sm text-muted-foreground">Route strategy, service territories, and dispatch planning.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>

        {/* Route Strategy */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" /><CardTitle className="text-base">Route Strategy</CardTitle></div>
            <CardDescription>How routes are prioritized and planned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Optimization priority</Label>
                <Select value={form.optimization_priority} onValueChange={v => set('optimization_priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortest_time">Shortest travel time</SelectItem>
                    <SelectItem value="shortest_distance">Shortest distance</SelectItem>
                    <SelectItem value="clustered_area">Clustered by area</SelectItem>
                    <SelectItem value="priority_first">Priority jobs first</SelectItem>
                    <SelectItem value="time_window">Time-window first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Planning mode</Label>
                <Select value={form.planning_mode} onValueChange={v => set('planning_mode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="assisted">Assisted (suggestions)</SelectItem>
                    <SelectItem value="auto">Auto-optimize</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Defaults */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><CardTitle className="text-base">Travel Defaults</CardTitle></div>
            <CardDescription>Buffer times, start location, and speed assumptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Default travel buffer (min)</Label>
                <Input type="number" value={form.default_travel_buffer} onChange={e => set('default_travel_buffer', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-sm">Avg travel speed (km/h)</Label>
                <Input type="number" value={form.avg_travel_speed_kmh} onChange={e => set('avg_travel_speed_kmh', parseInt(e.target.value) || 30)} />
              </div>
              <div>
                <Label className="text-sm">Service time weight</Label>
                <Input type="number" step="0.1" value={form.service_time_weight} onChange={e => set('service_time_weight', parseFloat(e.target.value) || 1)} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Start location / yard address</Label>
              <Input value={form.start_location} onChange={e => set('start_location', e.target.value)} placeholder="e.g. 123 Yard St, Edmonton AB" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div><p className="text-sm font-medium">Return to base</p><p className="text-xs text-muted-foreground">Workers return to start location at end of day</p></div>
              <Switch checked={form.return_to_base} onCheckedChange={v => set('return_to_base', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Service Territories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><CardTitle className="text-base">Service Territories</CardTitle></div>
              <Dialog open={territoryOpen} onOpenChange={v => { setTerritoryOpen(v); if (!v) { setEditId(null); setEditTerritory(EMPTY_TERRITORY); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Territory</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editId ? 'Edit Territory' : 'New Territory'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={editTerritory.name} onChange={e => setEditTerritory(p => ({ ...p, name: e.target.value }))} placeholder="e.g. South Edmonton" /></div>
                    <div><Label>Description</Label><Textarea value={editTerritory.description} onChange={e => setEditTerritory(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                    <div className="grid gap-4 grid-cols-2">
                      <div><Label>Color</Label><Input type="color" value={editTerritory.color} onChange={e => setEditTerritory(p => ({ ...p, color: e.target.value }))} /></div>
                      <div><Label>Sort order</Label><Input type="number" value={editTerritory.sort_order} onChange={e => setEditTerritory(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
                    </div>
                    <div><Label>Postal codes (comma-separated)</Label><Input value={editTerritory.postal_codes.join(', ')} onChange={e => setEditTerritory(p => ({ ...p, postal_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="T6H, T6J, T6K" /></div>
                    <div><Label>Cities (comma-separated)</Label><Input value={editTerritory.cities.join(', ')} onChange={e => setEditTerritory(p => ({ ...p, cities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Edmonton, Sherwood Park" /></div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch checked={editTerritory.is_active} onCheckedChange={v => setEditTerritory(p => ({ ...p, is_active: v }))} />
                    </div>
                    <Button className="w-full" disabled={!editTerritory.name || saveTerritoryMutation.isPending} onClick={() => saveTerritoryMutation.mutate()}>
                      {saveTerritoryMutation.isPending ? 'Saving…' : editId ? 'Update Territory' : 'Create Territory'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>Define geographic service zones and dispatch regions</CardDescription>
          </CardHeader>
          <CardContent>
            {territories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No territories defined yet. Add your first service zone.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Territory</TableHead>
                    <TableHead>Postal Codes</TableHead>
                    <TableHead>Cities</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {territories.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{t.postal_codes.join(', ') || '—'}</TableCell>
                      <TableCell className="text-sm">{t.cities.join(', ') || '—'}</TableCell>
                      <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteTerritoryMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {dirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved route settings
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
