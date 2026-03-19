import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Mail, Phone, FileText, ShieldCheck, DollarSign, Clock, AlertTriangle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'How do I submit an invoice?',
    a: 'Go to Invoices from the bottom nav or More menu, tap "Submit Invoice", fill in the details, attach your PDF or photo, and submit. The admin team will review and process it.',
  },
  {
    q: 'How do I update my insurance or compliance docs?',
    a: 'Navigate to More → Compliance. You can upload updated insurance certificates, WCB letters, business licenses, and safety documents directly from there.',
  },
  {
    q: 'When will I get paid?',
    a: 'Payments are processed on a Net 30 basis from the invoice approval date. You can check your payment history under More → Payments.',
  },
  {
    q: 'How do I report a site incident?',
    a: 'Go to More → Incidents & Damage to file a new report. Include photos, descriptions, and any witness information for fastest resolution.',
  },
  {
    q: 'How do I update my company details?',
    a: 'Contact the operations team to update your company name, business number, or address. Some fields can be viewed under More → Company Details.',
  },
  {
    q: 'My schedule changed — what do I do?',
    a: 'Check the Schedule tab for updated assignments. If you need to swap or decline a visit, contact the operations team immediately.',
  },
];

export default function SubcontractorSupport() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg animate-fade-in">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" /> Support
      </h1>

      {/* Contact card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact Praetoria Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            For assignment issues, payment questions, schedule changes, compliance inquiries, or any urgent matters.
          </p>
          <div className="space-y-2">
            <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <Mail className="h-4 w-4" /> ops@praetoriagroup.ca
            </a>
            <a href="tel:306-555-0100" className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <Phone className="h-4 w-4" /> 306-555-0100
            </a>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Mon–Fri 7:00 AM – 6:00 PM · Emergency: 24/7</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {[
            { icon: FileText, label: 'Submit Invoice', to: '/subcontractor/invoices' },
            { icon: ShieldCheck, label: 'Compliance', to: '/subcontractor/compliance' },
            { icon: DollarSign, label: 'Payments', to: '/subcontractor/payments' },
            { icon: AlertTriangle, label: 'Report Incident', to: '/subcontractor/incidents/new' },
          ].map(link => (
            <a
              key={link.to}
              href={link.to}
              className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <link.icon className="h-4 w-4 text-primary shrink-0" />
              {link.label}
            </a>
          ))}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
