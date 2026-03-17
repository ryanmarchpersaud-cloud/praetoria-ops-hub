import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, Mail, Phone } from 'lucide-react';

export default function SubcontractorSupport() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Support</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-foreground font-medium">Contact Praetoria Operations</p>
          <p className="text-xs text-muted-foreground">For assignment issues, payment questions, schedule changes, or compliance inquiries.</p>
          <div className="space-y-2 pt-2">
            <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-sm text-primary font-medium">
              <Mail className="h-4 w-4" /> ops@praetoriagroup.ca
            </a>
            <a href="tel:306-555-0100" className="flex items-center gap-2 text-sm text-primary font-medium">
              <Phone className="h-4 w-4" /> 306-555-0100
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center">
        <HelpCircle className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">In-app messaging coming soon</p>
      </div>
    </div>
  );
}
