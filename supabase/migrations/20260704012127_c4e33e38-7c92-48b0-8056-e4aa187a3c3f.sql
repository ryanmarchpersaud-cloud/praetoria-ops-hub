
-- ============================================================
-- Phase 14: PM notification triggers
-- All triggers wrapped in EXCEPTION handlers so business flows
-- never fail because of a notification insert error.
-- ============================================================

-- ------------------------------------------------------------
-- Owner messages
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_owner_message_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread RECORD;
  v_owner_user uuid;
BEGIN
  SELECT * INTO v_thread FROM public.pm_owner_message_threads WHERE id = NEW.thread_id;
  IF v_thread IS NULL THEN RETURN NEW; END IF;

  -- Staff → owner: notify every linked owner user
  IF NEW.sender_type IN ('admin','property_manager','system') AND NEW.is_owner_visible THEN
    FOR v_owner_user IN
      SELECT user_id FROM public.pm_property_owners
       WHERE id = v_thread.owner_id AND user_id IS NOT NULL
    LOOP
      PERFORM public.create_pm_notification(
        v_owner_user, 'owner', 'owner_message_new',
        'New message from Praetoria',
        'Praetoria replied to your message.',
        '/owner/messages',
        'normal', 'pm_owner_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, NULL, v_thread.owner_id, '{}'::jsonb
      );
    END LOOP;
  END IF;

  -- Owner → staff: notify assigned staff (or creator)
  IF NEW.sender_type = 'owner' THEN
    IF v_thread.assigned_staff_id IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_thread.assigned_staff_id, 'pm_staff', 'owner_message_new',
        'Owner replied',
        'An owner replied to a message thread.',
        '/property-management/owner-messages',
        'high', 'pm_owner_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, NULL, v_thread.owner_id, '{}'::jsonb
      );
    ELSIF v_thread.created_by IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_thread.created_by, 'pm_staff', 'owner_message_new',
        'Owner replied',
        'An owner replied to a message thread.',
        '/property-management/owner-messages',
        'high', 'pm_owner_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, NULL, v_thread.owner_id, '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_owner_message notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_owner_message_notify ON public.pm_owner_messages;
CREATE TRIGGER trg_pm_owner_message_notify
  AFTER INSERT ON public.pm_owner_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_owner_message_notify();

-- ------------------------------------------------------------
-- Tenant messages
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_tenant_message_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread RECORD;
  v_tenant_user uuid;
BEGIN
  SELECT * INTO v_thread FROM public.pm_tenant_message_threads WHERE id = NEW.thread_id;
  IF v_thread IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_type IN ('admin','property_manager','system')
     AND (NEW.is_tenant_visible IS NULL OR NEW.is_tenant_visible = true) THEN
    SELECT user_id INTO v_tenant_user FROM public.pm_tenants WHERE id = v_thread.tenant_id;
    IF v_tenant_user IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_tenant_user, 'tenant', 'tenant_message_new',
        'New message from Praetoria',
        'Praetoria replied to your message.',
        '/tenant/messages',
        'normal', 'pm_tenant_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, v_thread.tenant_id, NULL, '{}'::jsonb
      );
    END IF;
  END IF;

  IF NEW.sender_type = 'tenant' THEN
    IF v_thread.assigned_staff_id IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_thread.assigned_staff_id, 'pm_staff', 'tenant_message_new',
        'Tenant replied',
        'A tenant replied to a message thread.',
        '/property-management/tenant-messages',
        'high', 'pm_tenant_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, v_thread.tenant_id, NULL, '{}'::jsonb
      );
    ELSIF v_thread.created_by IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_thread.created_by, 'pm_staff', 'tenant_message_new',
        'Tenant replied',
        'A tenant replied to a message thread.',
        '/property-management/tenant-messages',
        'high', 'pm_tenant_message_thread', v_thread.id,
        v_thread.property_id, v_thread.unit_id, v_thread.tenant_id, NULL, '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_tenant_message notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_tenant_message_notify ON public.pm_tenant_messages;
CREATE TRIGGER trg_pm_tenant_message_notify
  AFTER INSERT ON public.pm_tenant_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_tenant_message_notify();

-- ------------------------------------------------------------
-- Owner approvals: sent → owner; responded → staff creator
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_owner_approval_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user uuid;
  v_old_status text;
  v_new_status text;
BEGIN
  v_new_status := NEW.status::text;
  v_old_status := CASE WHEN TG_OP='UPDATE' THEN OLD.status::text ELSE NULL END;

  -- Notify owner when approval becomes 'sent' (INSERT with sent OR UPDATE transition)
  IF v_new_status = 'sent'
     AND (TG_OP = 'INSERT' OR v_old_status IS DISTINCT FROM 'sent') THEN
    FOR v_owner_user IN
      SELECT user_id FROM public.pm_property_owners
       WHERE id = NEW.owner_id AND user_id IS NOT NULL
    LOOP
      PERFORM public.create_pm_notification(
        v_owner_user, 'owner', 'owner_approval_sent',
        'New approval request',
        'A new owner approval request is ready for review.',
        '/owner/approvals',
        'high', 'pm_owner_approval', NEW.id,
        NEW.property_id, NEW.unit_id, NULL, NEW.owner_id, '{}'::jsonb
      );
    END LOOP;
  END IF;

  -- Notify staff creator on response (approved/declined/questions)
  IF TG_OP = 'UPDATE'
     AND v_new_status IN ('approved','declined','questions','more_info_requested')
     AND v_old_status IS DISTINCT FROM v_new_status
     AND NEW.created_by IS NOT NULL THEN
    PERFORM public.create_pm_notification(
      NEW.created_by, 'pm_staff', 'owner_approval_response',
      'Owner responded to approval',
      'An owner responded to an approval request.',
      '/property-management/owner-approvals',
      'high', 'pm_owner_approval', NEW.id,
      NEW.property_id, NEW.unit_id, NULL, NEW.owner_id, '{}'::jsonb
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_owner_approval notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_owner_approval_notify ON public.pm_owner_approvals;
CREATE TRIGGER trg_pm_owner_approval_notify
  AFTER INSERT OR UPDATE ON public.pm_owner_approvals
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_owner_approval_notify();

-- ------------------------------------------------------------
-- Documents: notify tenant/owner when a visible document is shared
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_document_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user uuid;
  v_owner_user uuid;
  v_visibility text;
  v_is_inspection boolean;
BEGIN
  v_visibility := COALESCE(NEW.visibility::text, 'internal');
  v_is_inspection := (NEW.document_type::text = 'inspection');

  IF v_visibility = 'tenant' AND NEW.tenant_id IS NOT NULL THEN
    SELECT user_id INTO v_tenant_user FROM public.pm_tenants WHERE id = NEW.tenant_id;
    IF v_tenant_user IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_tenant_user, 'tenant',
        CASE WHEN v_is_inspection THEN 'inspection_submitted' ELSE 'document_shared' END,
        CASE WHEN v_is_inspection THEN 'Inspection report shared' ELSE 'New document shared' END,
        CASE WHEN v_is_inspection THEN 'An inspection report has been shared with you.' ELSE 'A new document has been shared with you.' END,
        CASE WHEN v_is_inspection THEN '/tenant/documents' ELSE '/tenant/documents' END,
        'normal', 'pm_document', NEW.id,
        NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
      );
    END IF;
  END IF;

  IF v_visibility = 'owner' AND NEW.owner_id IS NOT NULL THEN
    FOR v_owner_user IN
      SELECT user_id FROM public.pm_property_owners
       WHERE id = NEW.owner_id AND user_id IS NOT NULL
    LOOP
      PERFORM public.create_pm_notification(
        v_owner_user, 'owner',
        CASE WHEN v_is_inspection THEN 'inspection_submitted' ELSE 'document_shared' END,
        CASE WHEN v_is_inspection THEN 'Inspection report shared' ELSE 'New document shared' END,
        CASE WHEN v_is_inspection THEN 'An inspection report has been shared with you.' ELSE 'A new document has been shared with you.' END,
        '/owner/documents',
        'normal', 'pm_document', NEW.id,
        NEW.property_id, NEW.unit_id, NULL, NEW.owner_id, '{}'::jsonb
      );
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_document notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_document_notify ON public.pm_documents;
CREATE TRIGGER trg_pm_document_notify
  AFTER INSERT ON public.pm_documents
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_document_notify();

-- ------------------------------------------------------------
-- Inspections: assign & status changes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_inspection_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_old_assignee uuid;
BEGIN
  v_new_status := COALESCE(NEW.status::text,'');
  v_old_status := CASE WHEN TG_OP='UPDATE' THEN COALESCE(OLD.status::text,'') ELSE NULL END;
  v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;

  -- Assignment notification
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP='INSERT' OR v_old_assignee IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pm_notification(
      NEW.assigned_to, 'pm_staff', 'inspection_assigned',
      'Inspection assigned to you',
      'An inspection has been assigned to you.',
      '/pm-staff/inspections/' || NEW.id::text,
      'normal', 'pm_inspection', NEW.id,
      NEW.property_id, NEW.unit_id, NEW.tenant_id, NEW.owner_id, '{}'::jsonb
    );
  END IF;

  -- Submitted for review → notify creator
  IF TG_OP='UPDATE' AND v_new_status IN ('submitted','review','reviewed')
     AND v_old_status IS DISTINCT FROM v_new_status
     AND NEW.created_by IS NOT NULL THEN
    PERFORM public.create_pm_notification(
      NEW.created_by, 'pm_staff', 'inspection_submitted',
      'Inspection submitted',
      'An inspection has been submitted for review.',
      '/property-management/inspections/' || NEW.id::text,
      'normal', 'pm_inspection', NEW.id,
      NEW.property_id, NEW.unit_id, NEW.tenant_id, NEW.owner_id, '{}'::jsonb
    );
  END IF;

  IF TG_OP='UPDATE' AND v_new_status = 'completed'
     AND v_old_status IS DISTINCT FROM 'completed'
     AND NEW.created_by IS NOT NULL THEN
    PERFORM public.create_pm_notification(
      NEW.created_by, 'pm_staff', 'inspection_completed',
      'Inspection completed',
      'An inspection has been marked completed.',
      '/property-management/inspections/' || NEW.id::text,
      'normal', 'pm_inspection', NEW.id,
      NEW.property_id, NEW.unit_id, NEW.tenant_id, NEW.owner_id, '{}'::jsonb
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_inspection notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_inspection_notify ON public.pm_inspections;
CREATE TRIGGER trg_pm_inspection_notify
  AFTER INSERT OR UPDATE ON public.pm_inspections
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_inspection_notify();

-- ------------------------------------------------------------
-- Lease renewals
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_lease_renewal_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_old_assignee uuid;
  v_tenant_user uuid;
BEGIN
  v_new_status := COALESCE(NEW.status::text,'');
  v_old_status := CASE WHEN TG_OP='UPDATE' THEN COALESCE(OLD.status::text,'') ELSE NULL END;
  v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;

  -- Staff assignment
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP='INSERT' OR v_old_assignee IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pm_notification(
      NEW.assigned_to, 'pm_staff', 'lease_renewal_due',
      'Lease renewal assigned',
      'A lease renewal has been assigned to you.',
      '/property-management/lease-renewals',
      'normal', 'pm_lease_renewal', NEW.id,
      NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
    );
  END IF;

  -- Sent to tenant
  IF v_new_status IN ('sent','offered','offer_sent')
     AND (TG_OP='INSERT' OR v_old_status IS DISTINCT FROM v_new_status)
     AND NEW.tenant_id IS NOT NULL THEN
    SELECT user_id INTO v_tenant_user FROM public.pm_tenants WHERE id = NEW.tenant_id;
    IF v_tenant_user IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        v_tenant_user, 'tenant', 'lease_renewal_due',
        'Lease renewal offer',
        'A lease renewal offer is ready for your review.',
        '/tenant/lease',
        'high', 'pm_lease_renewal', NEW.id,
        NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
      );
    END IF;
  END IF;

  -- Tenant response
  IF TG_OP='UPDATE'
     AND v_new_status IN ('interested','questions','not_renewing','declined','accepted')
     AND v_old_status IS DISTINCT FROM v_new_status THEN
    IF NEW.assigned_to IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        NEW.assigned_to, 'pm_staff', 'lease_renewal_response',
        'Tenant responded to renewal',
        'A tenant responded to a lease renewal offer.',
        '/property-management/lease-renewals',
        'high', 'pm_lease_renewal', NEW.id,
        NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
      );
    ELSIF NEW.created_by IS NOT NULL THEN
      PERFORM public.create_pm_notification(
        NEW.created_by, 'pm_staff', 'lease_renewal_response',
        'Tenant responded to renewal',
        'A tenant responded to a lease renewal offer.',
        '/property-management/lease-renewals',
        'high', 'pm_lease_renewal', NEW.id,
        NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_lease_renewal notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_lease_renewal_notify ON public.pm_lease_renewals;
CREATE TRIGGER trg_pm_lease_renewal_notify
  AFTER INSERT OR UPDATE ON public.pm_lease_renewals
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_lease_renewal_notify();

-- ------------------------------------------------------------
-- Staff tasks
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_staff_task_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old_assignee uuid;
BEGIN
  v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;

  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP='INSERT' OR v_old_assignee IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pm_notification(
      NEW.assigned_to, 'pm_staff', 'task_assigned',
      'Task assigned to you',
      'A property management task has been assigned to you.',
      '/pm-staff/tasks',
      'normal', 'pm_staff_task', NEW.id,
      NEW.property_id, NEW.unit_id, NULL, NULL, '{}'::jsonb
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_staff_task notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_staff_task_notify ON public.pm_staff_tasks;
CREATE TRIGGER trg_pm_staff_task_notify
  AFTER INSERT OR UPDATE ON public.pm_staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_staff_task_notify();

-- ------------------------------------------------------------
-- Move-in / Move-out assignments
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_move_in_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old_assignee uuid;
BEGIN
  v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP='INSERT' OR v_old_assignee IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pm_notification(
      NEW.assigned_to, 'pm_staff', 'move_in_assigned',
      'Move-in assigned to you',
      'A move-in has been assigned to you.',
      '/pm-staff/move-ins',
      'normal', 'pm_move_in_checklist', NEW.id,
      NEW.property_id, NEW.unit_id, NULL, NULL, '{}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_move_in notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_move_in_notify ON public.pm_move_in_checklists;
CREATE TRIGGER trg_pm_move_in_notify
  AFTER INSERT OR UPDATE ON public.pm_move_in_checklists
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_move_in_notify();

CREATE OR REPLACE FUNCTION public.trg_pm_move_out_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old_assignee uuid;
BEGIN
  v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP='INSERT' OR v_old_assignee IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pm_notification(
      NEW.assigned_to, 'pm_staff', 'move_out_assigned',
      'Move-out assigned to you',
      'A move-out has been assigned to you.',
      '/pm-staff/move-outs',
      'normal', 'pm_move_out_checklist', NEW.id,
      NEW.property_id, NEW.unit_id, NEW.tenant_id, NULL, '{}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pm_move_out notify failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_move_out_notify ON public.pm_move_out_checklists;
CREATE TRIGGER trg_pm_move_out_notify
  AFTER INSERT OR UPDATE ON public.pm_move_out_checklists
  FOR EACH ROW EXECUTE FUNCTION public.trg_pm_move_out_notify();
