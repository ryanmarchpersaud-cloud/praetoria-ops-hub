import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, MapPin, Briefcase, Calendar, X } from 'lucide-react';
import { Link } from 'react-router-dom';

type ResultType = 'visit' | 'property' | 'job';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  link: string;
}

export default function WorkerSearch() {
  const [query, setQuery] = useState('');
  const { user } = useAuth();
  const trimmed = query.trim();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['worker_search', trimmed, user?.id],
    queryFn: async () => {
      if (trimmed.length < 2 || !user) return [];
      const q = `%${trimmed}%`;
      const out: SearchResult[] = [];

      // Search visits — RLS limits this to visits assigned directly, via job, or as crew.
      const { data: visits } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, service_date, properties(property_name), customers(first_name, last_name), jobs(assigned_to)')
        .or(`visit_number.ilike.${q}`)
        .limit(20);
      visits?.forEach((v: any) => {
        out.push({
          type: 'visit',
          id: v.id,
          title: v.visit_number,
          subtitle: [v.properties?.property_name, v.customers ? `${v.customers.first_name} ${v.customers.last_name}` : null, v.service_date].filter(Boolean).join(' · '),
          status: v.visit_status,
          link: `/worker/visit/${v.id}`,
        });
      });

      // Search properties — only those linked to jobs assigned to this worker
      const { data: props } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city')
        .or(`property_name.ilike.${q},address_line_1.ilike.${q},city.ilike.${q}`)
        .limit(20);
      if (props && props.length > 0) {
        // Check which properties have jobs assigned to this worker
        const propIds = props.map(p => p.id);
        const { data: assignedJobs } = await supabase
          .from('jobs')
          .select('property_id')
          .eq('assigned_to', user.id)
          .in('property_id', propIds);
        const assignedPropertyIds = new Set((assignedJobs || []).map((j: any) => j.property_id));
        props.forEach((p: any) => {
          if (!assignedPropertyIds.has(p.id)) return;
          out.push({
            type: 'property',
            id: p.id,
            title: p.property_name,
            subtitle: [p.address_line_1, p.city].filter(Boolean).join(', '),
            link: `/worker/property/${p.id}`,
          });
        });
      }

      // Search jobs — includes jobs where this worker is the lead or on any job visit crew.
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, job_title, status, customers(first_name, last_name), assigned_to')
        .or(`job_number.ilike.${q},job_title.ilike.${q}`)
        .limit(10);
      jobs?.forEach((j: any) => out.push({
        type: 'job',
        id: j.id,
        title: `${j.job_number} — ${j.job_title}`,
        subtitle: j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : '',
        status: j.status,
        link: `/worker/job/${j.id}`,
      }));

      return out;
    },
    enabled: trimmed.length >= 2 && !!user,
  });

  const iconMap: Record<ResultType, React.ElementType> = {
    visit: Calendar,
    property: MapPin,
    job: Briefcase,
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" /> Search
      </h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your visits, properties, jobs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {trimmed.length < 2 && (
        <div className="py-12 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Only your assigned work will appear</p>
        </div>
      )}

      {isLoading && trimmed.length >= 2 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      )}

      {!isLoading && trimmed.length >= 2 && results.length === 0 && (
        <div className="py-12 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No results for "{trimmed}"</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Only your assigned visits, jobs, and properties are searchable</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map(r => {
            const Icon = iconMap[r.type];
            return (
              <Link key={`${r.type}-${r.id}`} to={r.link}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        {r.status && <StatusBadge status={r.status} showIcon={false} />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider shrink-0">{r.type}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}