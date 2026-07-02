import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ---------- Types ----------
export type WOStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type AssigneeType = 'worker' | 'subcontractor' | 'unassigned';
export type AttachmentKind = 'before' | 'after' | 'completion' | 'other';

export interface CreateWorkOrderInput {
  request_id: string;
  assignee_type: AssigneeType;
  assigned_worker_id?: string | null;
  assigned_subcontractor_id?: string | null;
  share_tenant_contact?: boolean;
  access_notes?: string | null;
}

const sb: any = supabase;

async function logActivity(row: {
  request_id?: string | null;
  work_order_id?: string | null;
  event: string;
  detail?: any;
  tenant_visible?: boolean;
  actor_user_id?: string | null;
  actor_role?: string | null;
}) {
  try {
    await sb.from('pm_maintenance_activity').insert({
      detail: {},
      tenant_visible: false,
      ...row,
    });
  } catch (e) {
    console.warn('[pm-activity] insert failed', e);
  }
}

async function resolveAssigneeName(
  assignee_type: AssigneeType,
  worker_id?: string | null,
  sub_id?: string | null,
): Promise<string> {
  try {
    if (assignee_type === 'worker' && worker_id) {
      const { data } = await sb
        .from('team_members')
        .select('full_name, display_name')
        .eq('user_id', worker_id)
        .maybeSingle();
      return data?.full_name || data?.display_name || 'Worker';
    }
    if (assignee_type === 'subcontractor' && sub_id) {
      const { data } = await sb
        .from('subcontractors')
        .select('company_name, contact_name')
        .eq('id', sub_id)
        .maybeSingle();
      return data?.company_name || data?.contact_name || 'Subcontractor';
    }
  } catch {}
  return 'Unassigned';
}

async function insertAdminInAppNotification(subject: string, body: string, record_id?: string) {
  try {
    await sb.from('notifications').insert({
      event: 'pm_work_order_assigned',
      channel: 'in_app',
      audience: 'admin',
      record_type: 'pm_work_order',
      record_id: record_id ?? null,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[wo] admin in_app notify failed', e);
  }
}

// ---------- Admin ----------
export function useCreateWorkOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateWorkOrderInput) => {
      const { data: req, error: rErr } = await sb
        .from('pm_maintenance_requests')
        .select('*')
        .eq('id', input.request_id)
        .maybeSingle();
      if (rErr) throw rErr;
      if (!req) throw new Error('Maintenance request not found');

      const status: WOStatus =
        input.assignee_type !== 'unassigned' &&
        (input.assigned_worker_id || input.assigned_subcontractor_id)
          ? 'assigned'
          : 'created';

      const { data: wo, error } = await sb
        .from('pm_work_orders')
        .insert({
          maintenance_request_id: req.id,
          property_id: req.property_id,
          unit_id: req.unit_id,
          lease_id: req.lease_id,
          tenant_id: req.tenant_id,
          title: req.title,
          description: req.description,
          category: req.category,
          issue_label: req.issue_label,
          issue_key: req.issue_key,
          priority: req.priority,
          is_urgent_safety: !!req.is_urgent_safety,
          assignee_type: input.assignee_type,
          assigned_worker_id: input.assigned_worker_id ?? null,
          assigned_subcontractor_id: input.assigned_subcontractor_id ?? null,
          share_tenant_contact: !!input.share_tenant_contact,
          access_notes: input.access_notes ?? req.contact_notes ?? null,
          preferred_contact_time: req.preferred_contact_time ?? null,
          permission_to_enter: req.permission_to_enter ?? null,
          created_by: user?.id ?? null,
          status,
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        request_id: req.id,
        work_order_id: wo.id,
        event: 'wo_created',
        detail: { assignee_type: input.assignee_type },
        tenant_visible: true,
        actor_user_id: user?.id ?? null,
        actor_role: 'admin',
      });
      if (status === 'assigned') {
        await logActivity({
          request_id: req.id,
          work_order_id: wo.id,
          event: 'assigned',
          detail: {
            worker_id: input.assigned_worker_id,
            subcontractor_id: input.assigned_subcontractor_id,
          },
          tenant_visible: true,
          actor_user_id: user?.id ?? null,
          actor_role: 'admin',
        });
      }

      // Resolve assignee's display name so admin/ops see who was assigned
      const assigneeName = await resolveAssigneeName(
        input.assignee_type,
        input.assigned_worker_id,
        input.assigned_subcontractor_id,
      );

      // Notify worker assignee via existing in-app notifications table
      const recipient = input.assigned_worker_id || null;
      if (recipient) {
        try {
          await sb.from('notifications').insert({
            event: 'pm_work_order_assigned',
            channel: 'in_app',
            audience: 'worker',
            recipient_id: recipient,
            record_type: 'pm_work_order',
            record_id: wo.id,
            subject: `New PM Work Order: ${wo.work_order_number} — ${wo.title}`,
            body: 'You have been assigned a property-management work order. Open it for details.',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[wo] notify assignee failed', e);
        }
      }

      // Guaranteed admin in-app row so the red badge lights up immediately
      await insertAdminInAppNotification(
        `PM Work Order ${wo.work_order_number} — assigned to ${assigneeName}`,
        `${wo.title} (${wo.priority}) has been assigned to ${assigneeName}.`,
        wo.id,
      );

      // Ops email (also inserts an in_app row via the edge function)
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            event: 'pm_work_order_created',
            audience: 'admin',
            channels: ['email'],
            record_type: 'pm_work_order',
            record_id: wo.id,
            variables: {
              subject: `PM Work Order ${wo.work_order_number} — assigned to ${assigneeName}`,
              body:
                `A property-management work order was created from a maintenance request.\n\n` +
                `WO: ${wo.work_order_number}\nTitle: ${wo.title}\nPriority: ${wo.priority}\n` +
                `Assignee: ${assigneeName} (${input.assignee_type})\n\n` +
                `Open: https://praetoriagroup.ca/property-management/work-orders/${wo.id}`,
              reply_to: 'ops@praetoriagroup.ca',
            },
          },
        });
      } catch (e) {
        console.warn('[wo] ops email failed', e);
      }

      return wo;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-request', v.request_id] });
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-requests'] });
      qc.invalidateQueries({ queryKey: ['pm', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
      qc.invalidateQueries({ queryKey: ['notifications_all_recent'] });
    },
  });
}

export interface AssignWorkOrderInput {
  work_order_id: string;
  assignee_type: AssigneeType;
  assigned_worker_id?: string | null;
  assigned_subcontractor_id?: string | null;
  share_tenant_contact?: boolean;
}

export function useAssignWorkOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: AssignWorkOrderInput) => {
      const patch: any = {
        assignee_type: input.assignee_type,
        assigned_worker_id:
          input.assignee_type === 'worker' ? input.assigned_worker_id ?? null : null,
        assigned_subcontractor_id:
          input.assignee_type === 'subcontractor'
            ? input.assigned_subcontractor_id ?? null
            : null,
        share_tenant_contact: !!input.share_tenant_contact,
      };
      if (
        input.assignee_type !== 'unassigned' &&
        (input.assigned_worker_id || input.assigned_subcontractor_id)
      ) {
        patch.status = 'assigned';
      }
      const { data, error } = await sb
        .from('pm_work_orders')
        .update(patch)
        .eq('id', input.work_order_id)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        request_id: data.maintenance_request_id,
        work_order_id: data.id,
        event: 'assigned',
        detail: {
          assignee_type: input.assignee_type,
          worker_id: input.assigned_worker_id,
          subcontractor_id: input.assigned_subcontractor_id,
        },
        tenant_visible: true,
        actor_user_id: user?.id ?? null,
        actor_role: 'admin',
      });

      const assigneeName = await resolveAssigneeName(
        input.assignee_type,
        input.assigned_worker_id,
        input.assigned_subcontractor_id,
      );

      if (input.assignee_type === 'worker' && input.assigned_worker_id) {
        try {
          await sb.from('notifications').insert({
            event: 'pm_work_order_assigned',
            channel: 'in_app',
            audience: 'worker',
            recipient_id: input.assigned_worker_id,
            record_type: 'pm_work_order',
            record_id: data.id,
            subject: `PM Work Order Assigned: ${data.work_order_number}`,
            body: 'You have been assigned a property-management work order.',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        } catch {}
      }

      // Admin in-app + ops email so the red badge appears and ops has a record
      if (input.assignee_type !== 'unassigned') {
        await insertAdminInAppNotification(
          `PM Work Order ${data.work_order_number} — assigned to ${assigneeName}`,
          `${data.title} has been assigned to ${assigneeName}.`,
          data.id,
        );
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'pm_work_order_assigned',
              audience: 'admin',
              channels: ['email'],
              record_type: 'pm_work_order',
              record_id: data.id,
              variables: {
                subject: `PM Work Order ${data.work_order_number} — assigned to ${assigneeName}`,
                body:
                  `A property-management work order was assigned.\n\n` +
                  `WO: ${data.work_order_number}\nTitle: ${data.title}\n` +
                  `Assignee: ${assigneeName} (${input.assignee_type})\n\n` +
                  `Open: https://praetoriagroup.ca/property-management/work-orders/${data.id}`,
                reply_to: 'ops@praetoriagroup.ca',
              },
            },
          });
        } catch (e) {
          console.warn('[wo] ops assign email failed', e);
        }
      }
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'work-order', v.work_order_id] });
      qc.invalidateQueries({ queryKey: ['pm', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-requests'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
      qc.invalidateQueries({ queryKey: ['notifications_all_recent'] });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      work_order_id,
      status,
    }: {
      work_order_id: string;
      status: WOStatus;
    }) => {
      const patch: any = { status };
      if (status === 'completed') {
        patch.completed_at = new Date().toISOString();
        patch.completed_by = user?.id ?? null;
      }
      const { data, error } = await sb
        .from('pm_work_orders')
        .update(patch)
        .eq('id', work_order_id)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        request_id: data.maintenance_request_id,
        work_order_id: data.id,
        event: status === 'completed' ? 'completed' : 'status_changed',
        detail: { status },
        tenant_visible: true,
        actor_user_id: user?.id ?? null,
      });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'work-order', v.work_order_id] });
      qc.invalidateQueries({ queryKey: ['pm', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-requests'] });
      qc.invalidateQueries({ queryKey: ['worker', 'pm-work-orders'] });
      qc.invalidateQueries({ queryKey: ['sub', 'pm-work-orders'] });
    },
  });
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      work_order_id,
      completion_notes,
      tenant_visible_completion_note,
    }: {
      work_order_id: string;
      completion_notes?: string;
      tenant_visible_completion_note?: string;
    }) => {
      const { data, error } = await sb
        .from('pm_work_orders')
        .update({
          status: 'completed',
          completion_notes: completion_notes ?? null,
          tenant_visible_completion_note: tenant_visible_completion_note ?? null,
          completed_at: new Date().toISOString(),
          completed_by: user?.id ?? null,
        })
        .eq('id', work_order_id)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        request_id: data.maintenance_request_id,
        work_order_id: data.id,
        event: 'completed',
        detail: { has_tenant_note: !!tenant_visible_completion_note },
        tenant_visible: true,
        actor_user_id: user?.id ?? null,
      });
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'work-order', v.work_order_id] });
      qc.invalidateQueries({ queryKey: ['pm', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['worker', 'pm-work-orders'] });
      qc.invalidateQueries({ queryKey: ['sub', 'pm-work-orders'] });
      qc.invalidateQueries({ queryKey: ['tenant-portal'] });
    },
  });
}

// ---------- Queries ----------
export function useAdminWorkOrders() {
  return useQuery({
    queryKey: ['pm', 'work-orders'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('pm_work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminWorkOrder(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['pm', 'work-order', id],
    queryFn: async () => {
      const { data, error } = await sb
        .from('pm_work_orders')
        .select(`*,
          property:pm_managed_properties(id, property_name, address_line_1, city),
          unit:pm_units(id, unit_label),
          tenant:pm_tenants(id, first_name, last_name, phone, email),
          request:pm_maintenance_requests(id, title, status, tenant_facing_update)`)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      const { data: atts } = await sb
        .from('pm_work_order_attachments')
        .select('*')
        .eq('work_order_id', id)
        .order('created_at', { ascending: false });
      return { ...(data ?? {}), attachments: atts ?? [] };
    },
  });
}

export function useWorkOrderForRequest(request_id?: string) {
  return useQuery({
    enabled: !!request_id,
    queryKey: ['pm', 'wo-for-request', request_id],
    queryFn: async () => {
      const { data, error } = await sb
        .from('pm_work_orders')
        .select('*')
        .eq('maintenance_request_id', request_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestActivity(request_id?: string, tenantOnly = false) {
  return useQuery({
    enabled: !!request_id,
    queryKey: ['pm', 'activity', request_id, tenantOnly],
    queryFn: async () => {
      let q = sb
        .from('pm_maintenance_activity')
        .select('*')
        .eq('request_id', request_id)
        .order('created_at', { ascending: true });
      if (tenantOnly) q = q.eq('tenant_visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Worker / Sub queries ----------
export function useMyAssignedPMWorkOrders() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['worker', 'pm-work-orders', user?.id],
    queryFn: async () => {
      const { data: subRow } = await sb
        .from('subcontractors')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      const subId = subRow?.id ?? null;
      const orClauses = [`assigned_worker_id.eq.${user!.id}`];
      if (subId) orClauses.push(`assigned_subcontractor_id.eq.${subId}`);
      const { data, error } = await sb
        .from('pm_work_orders')
        .select(
          'id, work_order_number, title, category, issue_label, priority, is_urgent_safety, status, created_at, property_id, unit_id, share_tenant_contact'
        )
        .or(orClauses.join(','))
        .in('status', ['created', 'assigned', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Assignee-scoped detail. Excludes admin-only + tenant private fields. */
export function useAssigneeWorkOrder(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['worker', 'pm-work-order', id],
    queryFn: async () => {
      const { data, error } = await sb
        .from('pm_work_orders')
        .select(
          `id, work_order_number, title, description, category, issue_label, issue_key, priority, is_urgent_safety,
           status, assignee_type, assigned_worker_id, assigned_subcontractor_id, share_tenant_contact,
           access_notes, preferred_contact_time, permission_to_enter, completion_notes, completed_at,
           property:pm_managed_properties(id, property_name, address_line_1, city, province, postal_code),
           unit:pm_units(id, unit_label),
           tenant:pm_tenants(id, first_name, last_name, phone, email)`
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      const { data: atts } = await sb
        .from('pm_work_order_attachments')
        .select('*')
        .eq('work_order_id', id)
        .order('created_at', { ascending: false });
      // Strip tenant contact if not shared
      if (data && !data.share_tenant_contact && data.tenant) {
        data.tenant = {
          id: data.tenant.id,
          first_name: data.tenant.first_name,
          last_name: data.tenant.last_name,
          phone: null,
          email: null,
        };
      }
      return { ...(data ?? {}), attachments: atts ?? [] };
    },
  });
}

// ---------- Attachments ----------
export async function signWOAttachment(path: string) {
  const { data, error } = await supabase.storage
    .from('pm-maintenance-attachments')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function useUploadWorkOrderAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      work_order_id,
      file,
      kind = 'other',
      tenant_visible = false,
    }: {
      work_order_id: string;
      file: File;
      kind?: AttachmentKind;
      tenant_visible?: boolean;
    }) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `wo/${work_order_id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('pm-maintenance-attachments')
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data, error } = await sb
        .from('pm_work_order_attachments')
        .insert({
          work_order_id,
          storage_path: path,
          file_name: file.name,
          content_type: file.type,
          kind,
          tenant_visible,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'work-order', v.work_order_id] });
      qc.invalidateQueries({ queryKey: ['worker', 'pm-work-order', v.work_order_id] });
    },
  });
}

export function useSetAttachmentTenantVisible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      tenant_visible,
      table,
    }: {
      id: string;
      tenant_visible: boolean;
      table: 'pm_maintenance_request_attachments' | 'pm_work_order_attachments';
    }) => {
      const { error } = await sb.from(table).update({ tenant_visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm'] });
    },
  });
}

// ---------- Team pickers ----------
export function useAssignableWorkers() {
  return useQuery({
    queryKey: ['pm', 'assignable-workers'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('team_members')
        .select('user_id, full_name, display_name, team_type, portal_worker, is_active, status')
        .eq('is_active', true)
        .not('user_id', 'is', null);
      if (error) throw error;
      return (data ?? []).filter(
        (t: any) => t.portal_worker || t.team_type === 'Worker' || t.team_type === 'Admin'
      );
    },
  });
}

export function useAssignableSubcontractors() {
  return useQuery({
    queryKey: ['pm', 'assignable-subs'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('subcontractors')
        .select('id, contact_name, company_name, active_flag')
        .eq('active_flag', true)
        .order('company_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Tenant view ----------
export function useMyRequestVisibleWOAttachments(request_id?: string) {
  return useQuery({
    enabled: !!request_id,
    queryKey: ['tenant-portal', 'wo-attachments', request_id],
    queryFn: async () => {
      const { data: wo } = await sb
        .from('pm_work_orders')
        .select('id, tenant_visible_completion_note, status, completed_at, work_order_number')
        .eq('maintenance_request_id', request_id)
        .maybeSingle();
      if (!wo?.id) return { work_order: null, attachments: [] as any[] };
      const { data: atts } = await sb
        .from('pm_work_order_attachments')
        .select('*')
        .eq('work_order_id', wo.id)
        .eq('tenant_visible', true);
      return { work_order: wo, attachments: atts ?? [] };
    },
  });
}
