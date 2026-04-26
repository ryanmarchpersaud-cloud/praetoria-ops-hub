import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, format } from 'date-fns';

export function useDashboardRequests() {
  return useQuery({
    queryKey: ['dashboard_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardQuotes() {
  return useQuery({
    queryKey: ['dashboard_quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, approval_status, total, created_at, quote_number, follow_up_due_at, sent_status, leads(first_name, last_name, company_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardJobs() {
  return useQuery({
    queryKey: ['dashboard_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, job_title, job_number, scheduled_date, customer_id, assigned_to, created_at, service_category')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardInvoices() {
  return useQuery({
    queryKey: ['dashboard_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, status, total, balance_due, due_date, issue_date, paid_at, amount_paid, created_at, job_id, jobs(service_category), customers(first_name, last_name, company_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodayVisits() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard_today_visits', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*, jobs(job_title, job_number), properties(property_name), customers(first_name, last_name, company_name)')
        .eq('service_date', today)
        .order('scheduled_start_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardEmployees() {
  return useQuery({
    queryKey: ['dashboard_employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('user_id, full_name, role_title, employment_status, hourly_rate')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardIncidents() {
  return useQuery({
    queryKey: ['dashboard_incidents_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('id, severity, follow_up_status, incident_type, date_time')
        .order('date_time', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? [])
        .filter((incident: any) => !incident.follow_up_status || !['resolved', 'closed'].includes(incident.follow_up_status))
        .slice(0, 10);
    },
  });
}

export function useDashboardLeads() {
  return useQuery({
    queryKey: ['dashboard_leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, status, first_name, last_name, company_name, service_type, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardActivities() {
  return useQuery({
    queryKey: ['dashboard_activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, action_name, record_type, record_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardSubcontractorInvoices() {
  return useQuery({
    queryKey: ['dashboard_subcontractor_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_invoices')
        .select('id, status, amount, submitted_at, invoice_number')
        .in('status', ['submitted', 'approved'])
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardCertifications() {
  return useQuery({
    queryKey: ['dashboard_expiring_certs'],
    queryFn: async () => {
      const thirtyDaysOut = new Date();
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
      const { data, error } = await supabase
        .from('worker_certifications')
        .select('id, cert_name, expiry_date, status, user_id')
        .lte('expiry_date', thirtyDaysOut.toISOString())
        .eq('status', 'valid')
        .order('expiry_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
