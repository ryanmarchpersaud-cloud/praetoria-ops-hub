-- 1) Tighten anonymous read on 'attachments' bucket to an exact filename whitelist
DROP POLICY IF EXISTS "attachments_anon_read_public_logos" ON storage.objects;

CREATE POLICY "attachments_anon_read_public_logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'attachments'
  AND name IN (
    'praetoria-logo-white.png',
    'company-logo-1774714820674.jpg',
    'company-logo-1774723606421.png',
    'company-logo-1774745124125.jpg'
  )
);

-- 2) Prevent workers from mutating sensitive equipment fields; only replacement_requested may change
CREATE OR REPLACE FUNCTION public.restrict_worker_equipment_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ops/HR/managers bypass this restriction
  IF public.is_admin_or_owner(auth.uid())
     OR public.has_role(auth.uid(), 'hr_admin'::app_role)
     OR public.has_role(auth.uid(), 'manager'::app_role) THEN
    RETURN NEW;
  END IF;

  -- For the record owner (worker), allow only replacement_requested and notes to change
  IF auth.uid() = OLD.user_id THEN
    IF NEW.user_id       IS DISTINCT FROM OLD.user_id
       OR NEW.item_type      IS DISTINCT FROM OLD.item_type
       OR NEW.item_name      IS DISTINCT FROM OLD.item_name
       OR NEW.serial_number  IS DISTINCT FROM OLD.serial_number
       OR NEW.issued_date    IS DISTINCT FROM OLD.issued_date
       OR NEW.return_date    IS DISTINCT FROM OLD.return_date
       OR NEW.condition      IS DISTINCT FROM OLD.condition THEN
      RAISE EXCEPTION 'Workers may only request replacements; contact HR to change equipment details.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_worker_equipment_updates ON public.worker_equipment_items;
CREATE TRIGGER trg_restrict_worker_equipment_updates
BEFORE UPDATE ON public.worker_equipment_items
FOR EACH ROW
EXECUTE FUNCTION public.restrict_worker_equipment_updates();