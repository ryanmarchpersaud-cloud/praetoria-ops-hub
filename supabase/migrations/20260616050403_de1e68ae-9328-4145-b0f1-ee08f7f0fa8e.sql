CREATE OR REPLACE FUNCTION public.sync_paid_subcontractor_pay_stub_to_ledgers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  effective_date date;
  effective_method text;
  existing_sub_payment_id uuid;
  existing_finance_payment_id uuid;
BEGIN
  IF NEW.status = 'paid' AND COALESCE(NEW.total, 0) > 0 THEN
    effective_date := COALESCE(NEW.payment_date, NEW.period_end, CURRENT_DATE);
    effective_method := COALESCE(NULLIF(NEW.payment_method, ''), 'Other');

    SELECT id
      INTO existing_sub_payment_id
      FROM public.subcontractor_payments
     WHERE subcontractor_id = NEW.subcontractor_id
       AND reference_number = NEW.pay_stub_number
     ORDER BY created_at ASC
     LIMIT 1;

    IF existing_sub_payment_id IS NULL THEN
      INSERT INTO public.subcontractor_payments (
        subcontractor_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes
      ) VALUES (
        NEW.subcontractor_id,
        NEW.total,
        effective_date,
        effective_method,
        NEW.pay_stub_number,
        'Auto-linked from paid pay stub ' || COALESCE(NEW.pay_stub_number, NEW.id::text)
      );
    ELSE
      UPDATE public.subcontractor_payments
         SET amount = NEW.total,
             payment_date = effective_date,
             payment_method = effective_method,
             notes = COALESCE(notes, 'Auto-linked from paid pay stub ' || COALESCE(NEW.pay_stub_number, NEW.id::text))
       WHERE id = existing_sub_payment_id;
    END IF;

    SELECT id
      INTO existing_finance_payment_id
      FROM public.finance_payments
     WHERE payment_type = 'subcontractor_payout'
       AND reference_number = NEW.pay_stub_number
       AND COALESCE(internal_note, '') LIKE '%' || NEW.subcontractor_id::text || '%'
       AND is_reversed = false
     ORDER BY created_at ASC
     LIMIT 1;

    IF existing_finance_payment_id IS NULL THEN
      INSERT INTO public.finance_payments (
        payment_type,
        payment_date,
        amount,
        payment_method,
        reference_number,
        internal_note,
        is_reversed
      ) VALUES (
        'subcontractor_payout',
        effective_date,
        NEW.total,
        effective_method,
        NEW.pay_stub_number,
        'Subcontractor payout from pay stub ' || COALESCE(NEW.pay_stub_number, NEW.id::text) || '; subcontractor_id=' || NEW.subcontractor_id::text,
        false
      );
    ELSE
      UPDATE public.finance_payments
         SET payment_date = effective_date,
             amount = NEW.total,
             payment_method = effective_method,
             internal_note = 'Subcontractor payout from pay stub ' || COALESCE(NEW.pay_stub_number, NEW.id::text) || '; subcontractor_id=' || NEW.subcontractor_id::text
       WHERE id = existing_finance_payment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_paid_subcontractor_pay_stub_to_ledgers ON public.subcontractor_pay_stubs;
CREATE TRIGGER trg_sync_paid_subcontractor_pay_stub_to_ledgers
AFTER INSERT OR UPDATE OF status, total, payment_date, payment_method, pay_stub_number, subcontractor_id
ON public.subcontractor_pay_stubs
FOR EACH ROW
EXECUTE FUNCTION public.sync_paid_subcontractor_pay_stub_to_ledgers();