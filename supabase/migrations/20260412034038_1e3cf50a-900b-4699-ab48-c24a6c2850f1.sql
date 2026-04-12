
-- Agreement Templates
CREATE TABLE public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  body_html TEXT NOT NULL DEFAULT '',
  merge_fields JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active templates"
  ON public.agreement_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage templates"
  ON public.agreement_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Agreements
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.agreement_templates(id),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'customer',
  recipient_user_id UUID,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  body_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  signing_token UUID DEFAULT gen_random_uuid(),
  merge_data JSONB DEFAULT '{}'::jsonb,
  internal_reference TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  superseded_by UUID REFERENCES public.agreements(id),
  -- linked records
  customer_id UUID REFERENCES public.customers(id),
  property_id UUID REFERENCES public.properties(id),
  quote_id UUID REFERENCES public.quotes(id),
  job_id UUID REFERENCES public.jobs(id),
  subcontractor_user_id UUID,
  employee_user_id UUID,
  -- timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agreements_status ON public.agreements(status);
CREATE INDEX idx_agreements_signing_token ON public.agreements(signing_token);
CREATE INDEX idx_agreements_recipient ON public.agreements(recipient_user_id);
CREATE INDEX idx_agreements_customer ON public.agreements(customer_id);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view own or created agreements"
  ON public.agreements FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR sent_by = auth.uid()
    OR recipient_user_id = auth.uid()
  );

CREATE POLICY "Authenticated can create agreements"
  ON public.agreements FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update own or created agreements"
  ON public.agreements FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR sent_by = auth.uid()
    OR recipient_user_id = auth.uid()
  );

-- Public select for signing token access (anonymous signing)
CREATE POLICY "Anyone can view agreement by signing token"
  ON public.agreements FOR SELECT TO anon
  USING (signing_token IS NOT NULL);

-- Allow anon to update status during signing
CREATE POLICY "Anon can update agreement via signing token"
  ON public.agreements FOR UPDATE TO anon
  USING (signing_token IS NOT NULL);

-- Agreement Signatures
CREATE TABLE public.agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT,
  signature_type TEXT NOT NULL DEFAULT 'typed',
  consent_text TEXT DEFAULT 'I have read and agree to the terms of this agreement.',
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view signatures for own agreements"
  ON public.agreement_signatures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = agreement_id
      AND (a.created_by = auth.uid() OR a.recipient_user_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can insert signature"
  ON public.agreement_signatures FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Agreement Audit Log
CREATE TABLE public.agreement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit logs for own agreements"
  ON public.agreement_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = agreement_id
      AND (a.created_by = auth.uid() OR a.recipient_user_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can insert audit log"
  ON public.agreement_audit_log FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Seed default agreement templates
INSERT INTO public.agreement_templates (name, category, description, body_html, merge_fields) VALUES
('Snow & Ice Service Agreement', 'snow', 'Standard seasonal snow and ice management agreement', '<h1>Snow & Ice Service Agreement</h1><p>This agreement is entered into between <strong>{{company_name}}</strong> ("Service Provider") and <strong>{{customer_name}}</strong> ("Client") for snow and ice management services at the following property:</p><p><strong>Property:</strong> {{property_address}}</p><h2>Service Details</h2><p><strong>Service Type:</strong> {{service_type}}<br/><strong>Season:</strong> {{start_date}} to {{end_date}}</p><h2>Pricing & Payment</h2><p>{{pricing_terms}}</p><h2>Terms & Conditions</h2><p>{{special_conditions}}</p><p>{{notes}}</p><p><strong>Reference:</strong> {{internal_reference}}</p>', '["company_name","customer_name","property_address","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Junk Removal Agreement', 'junk_removal', 'One-time or recurring junk removal service agreement', '<h1>Junk Removal Service Agreement</h1><p>This agreement is between <strong>{{company_name}}</strong> and <strong>{{customer_name}}</strong> for junk removal services.</p><p><strong>Property:</strong> {{property_address}}</p><h2>Service Details</h2><p><strong>Service Date:</strong> {{start_date}}<br/><strong>Description:</strong> {{service_type}}</p><h2>Pricing</h2><p>{{pricing_terms}}</p><p>{{notes}}</p>', '["company_name","customer_name","property_address","service_type","start_date","pricing_terms","notes","internal_reference"]'),
('Cleaning Service Agreement', 'cleaning', 'Residential or commercial cleaning service agreement', '<h1>Cleaning Service Agreement</h1><p>This agreement is between <strong>{{company_name}}</strong> and <strong>{{customer_name}}</strong>.</p><p><strong>Property:</strong> {{property_address}}</p><h2>Service Schedule</h2><p><strong>Start Date:</strong> {{start_date}}<br/><strong>End Date:</strong> {{end_date}}<br/><strong>Service Type:</strong> {{service_type}}</p><h2>Pricing & Payment</h2><p>{{pricing_terms}}</p><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","customer_name","property_address","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Landscaping Agreement', 'landscaping', 'Grounds and landscaping service agreement', '<h1>Landscaping & Grounds Agreement</h1><p>This agreement is between <strong>{{company_name}}</strong> and <strong>{{customer_name}}</strong>.</p><p><strong>Property:</strong> {{property_address}}</p><h2>Service Details</h2><p><strong>Type:</strong> {{service_type}}<br/><strong>Period:</strong> {{start_date}} to {{end_date}}</p><h2>Pricing</h2><p>{{pricing_terms}}</p><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","customer_name","property_address","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Property Maintenance Agreement', 'property_maintenance', 'Ongoing property care and maintenance agreement', '<h1>Property Maintenance Agreement</h1><p>Between <strong>{{company_name}}</strong> and <strong>{{customer_name}}</strong>.</p><p><strong>Property:</strong> {{property_address}}</p><h2>Services</h2><p>{{service_type}}</p><h2>Term</h2><p>{{start_date}} to {{end_date}}</p><h2>Pricing</h2><p>{{pricing_terms}}</p><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","customer_name","property_address","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Property Management Agreement', 'property_management', 'Full property management service agreement', '<h1>Property Management Agreement</h1><p>Between <strong>{{company_name}}</strong> and <strong>{{customer_name}}</strong>.</p><p><strong>Property:</strong> {{property_address}}</p><h2>Scope of Management</h2><p>{{service_type}}</p><h2>Term</h2><p>{{start_date}} to {{end_date}}</p><h2>Fees</h2><p>{{pricing_terms}}</p><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","customer_name","property_address","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Subcontractor Agreement', 'subcontractor', 'Independent contractor services agreement', '<h1>Subcontractor Services Agreement</h1><p>This agreement is between <strong>{{company_name}}</strong> ("Company") and <strong>{{subcontractor_name}}</strong> ("Contractor").</p><h2>Scope of Work</h2><p>{{service_type}}</p><h2>Term</h2><p><strong>Start:</strong> {{start_date}}<br/><strong>End:</strong> {{end_date}}</p><h2>Compensation</h2><p>{{pricing_terms}}</p><h2>Requirements</h2><p>The Contractor must maintain valid insurance, WCB coverage, and all required licenses.</p><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","subcontractor_name","service_type","start_date","end_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Employee / Worker Agreement', 'employee', 'Employment or worker agreement', '<h1>Employment Agreement</h1><p>This agreement is between <strong>{{company_name}}</strong> ("Employer") and <strong>{{employee_name}}</strong> ("Employee").</p><h2>Position</h2><p><strong>Role:</strong> {{role_title}}<br/><strong>Start Date:</strong> {{start_date}}</p><h2>Compensation</h2><p>{{pricing_terms}}</p><h2>Terms of Employment</h2><p>{{special_conditions}}</p><p>{{notes}}</p>', '["company_name","employee_name","role_title","start_date","pricing_terms","special_conditions","notes","internal_reference"]'),
('Policy Acknowledgement', 'policy_acknowledgement', 'Document or policy acknowledgement', '<h1>Policy Acknowledgement</h1><p>I, <strong>{{recipient_name}}</strong>, acknowledge that I have read, understood, and agree to the following:</p><h2>{{policy_title}}</h2><p>{{policy_content}}</p><p>{{notes}}</p><p><strong>Date:</strong> {{start_date}}</p>', '["company_name","recipient_name","policy_title","policy_content","start_date","notes","internal_reference"]');
