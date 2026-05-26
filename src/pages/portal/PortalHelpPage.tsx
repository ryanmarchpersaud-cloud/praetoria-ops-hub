import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Mail, Phone, Clock, MessageSquarePlus, FileText, Receipt, Camera, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { AppDownloadBadges } from '@/components/AppDownloadBadges';

const FAQ_ITEMS = [
  {
    icon: MessageSquarePlus,
    q: 'How do I request a service?',
    a: 'Go to "My Requests" from the menu, then tap "Request Service." The step-by-step wizard will guide you through selecting a service, choosing a property, picking a preferred date, and adding any special instructions. You\'ll receive updates as your request is reviewed.',
  },
  {
    icon: FileText,
    q: 'How do quotes and approvals work?',
    a: 'After you submit a request, our team may send you a quote with pricing details. You can view it under "My Quotes," review the scope and cost, then approve or decline. Once approved, the work is scheduled automatically.',
  },
  {
    icon: Receipt,
    q: 'How do invoices and payments work?',
    a: 'Invoices appear under "Billing" once work is completed. You can view each invoice, see line-item details, and make payments online. If autopay is enabled, charges are processed automatically on your saved payment method.',
  },
  {
    icon: ClipboardCheck,
    q: 'How do I view my visit history and status?',
    a: 'Go to "My Visits" to see all scheduled, in-progress, and completed visits. Each visit shows the date, crew, status, and any notes. Tap a visit to see full details including before/after photos.',
  },
  {
    icon: Camera,
    q: 'How do I view property photos?',
    a: 'Go to "My Photos" to browse all photos taken during service visits. Photos are organized by property and date so you can track the condition of your property over time.',
  },
  {
    icon: ShieldCheck,
    q: 'How does my service plan work?',
    a: 'Under "My Plan," you can see your current service agreement, included services, and plan details. Recurring services are automatically scheduled based on your plan frequency.',
  },
];

export default function PortalHelpPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" /> Help & FAQ
      </h1>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li><span className="text-foreground font-medium">Request</span> — Submit a service request through the portal.</li>
            <li><span className="text-foreground font-medium">Quote</span> — Receive and approve a quote with clear pricing.</li>
            <li><span className="text-foreground font-medium">Schedule</span> — Work is scheduled at a time that suits you.</li>
            <li><span className="text-foreground font-medium">Service</span> — Our team completes the work and uploads photos.</li>
            <li><span className="text-foreground font-medium">Pay</span> — View your invoice and pay online or via autopay.</li>
          </ol>
        </CardContent>
      </Card>

      {/* FAQ accordion */}
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

      {/* Contact support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            For billing questions, service inquiries, schedule changes, or any concerns.
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

      {/* Mobile app download */}
      <AppDownloadBadges />

      {/* Credibility note */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Trusted by commercial and residential clients across Saskatchewan.
            Professional standards · Documented service · Safety and compliance focused.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
