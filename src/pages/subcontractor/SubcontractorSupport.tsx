import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Mail, Phone, FileText, ShieldCheck, DollarSign, Clock, AlertTriangle, CalendarCheck, Camera, ClipboardCheck, Truck, BookOpen } from 'lucide-react';
import { AppDownloadBadges } from '@/components/AppDownloadBadges';

const QUICK_START_STEPS = [
  { label: 'Check your schedule', desc: 'View assigned visits from the Schedule tab.' },
  { label: 'Complete assigned work', desc: 'Open a visit, update status step-by-step (En Route → On Site → Done).' },
  { label: 'Upload photos & notes', desc: 'Capture before/after photos and add completion notes during visits.' },
  { label: 'Submit invoices', desc: 'Go to Invoices and submit for completed work.' },
  { label: 'Stay compliant', desc: 'Keep insurance, WCB, and licenses up to date under Compliance.' },
];

const FAQ_ITEMS = [
  {
    icon: CalendarCheck,
    q: 'How do I view my assigned work?',
    a: 'Open the Schedule tab from the bottom navigation. You\'ll see all upcoming visits assigned to you, organized by date. Tap any visit to see full details including property info, scope of work, and access instructions.',
  },
  {
    icon: Truck,
    q: 'How do I update my status and complete work?',
    a: 'Open an assigned visit and use the status stepper to progress through each stage: Scheduled → En Route → On Site → Done. Each status update is timestamped and visible to the operations team in real time.',
  },
  {
    icon: Camera,
    q: 'How do I upload photos and notes?',
    a: 'During a visit, use the photo capture section to take before/after photos. You can also add completion notes and flag any issues. Photos are uploaded directly to the job record for documentation.',
  },
  {
    icon: FileText,
    q: 'How do I submit an invoice?',
    a: 'Go to Invoices from the bottom nav or More menu, tap "Submit Invoice," fill in the details, attach your PDF or photo, and submit. Invoices are auto-numbered (SUB-INV-XXXXX) and the admin team will review and process them.',
  },
  {
    icon: ShieldCheck,
    q: 'How do I upload compliance documents?',
    a: 'Navigate to More → Compliance. You can upload updated insurance certificates, WCB letters, business licenses, and safety documents directly. Keep these current to maintain your active status.',
  },
  {
    icon: DollarSign,
    q: 'How does the payout / payment process work?',
    a: 'Payments are processed on a Net 30 basis from the invoice approval date. You can check your payment history and pending amounts under More → Payments. Ensure your payment details are up to date under Settings.',
  },
  {
    icon: AlertTriangle,
    q: 'How do I report a site incident?',
    a: 'Go to More → Incidents & Damage to file a new report. Include photos, descriptions, location, and any witness information. Reports are sent to the operations team immediately for review.',
  },
  {
    icon: ClipboardCheck,
    q: 'How do I update my company details?',
    a: 'You can view your company profile under More → Company Details. For changes to your company name, business number, or address, contact the operations team directly.',
  },
  {
    icon: BookOpen,
    q: 'My schedule changed — what do I do?',
    a: 'Check the Schedule tab for updated assignments. If you need to swap or decline a visit, contact the operations team immediately using the contact info below.',
  },
];

export default function SubcontractorSupport() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg animate-fade-in">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" /> Support & Quick Start
      </h1>

      {/* Quick start steps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            {QUICK_START_STEPS.map((step, i) => (
              <li key={i}>
                <span className="text-foreground font-medium">{step.label}</span>
                <span className="text-xs"> — {step.desc}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

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
            <a href="tel:+13067376269" className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <Phone className="h-4 w-4" /> (306) 737-6269
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
                <AccordionTrigger className="text-sm text-left gap-2">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground ml-6">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Mobile app download */}
      <AppDownloadBadges
        title="Get the Praetoria Ops Hub app"
        description="Check your schedule, update visits, upload photos and submit invoices from your phone."
      />

      {/* Credibility note */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Professional standards · Reliable partner workflow · Safety and compliance focused.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
