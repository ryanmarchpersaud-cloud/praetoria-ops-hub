import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SprayCan, ExternalLink, Send, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CleaningPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PARTNER_URL = 'https://donrypropertysolutions.ca';
const PARTNER_NAME = 'Donry Property Solutions';

export function CleaningPartnerDialog({ open, onOpenChange }: CleaningPartnerDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
              <SprayCan className="w-5 h-5 text-rose-600" />
            </div>
            <DialogTitle className="text-base">Cleaning Services</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Cleaning services are currently available through a trusted Praetoria partner.
            You can request cleaning through Praetoria or visit our partner directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 mt-1">
          <Handshake className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Trusted Partner:</span>{' '}
            {PARTNER_NAME}
          </p>
        </div>

        <div className="grid gap-2 mt-3">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate('/requests?service=cleaning');
            }}
          >
            <Send className="w-4 h-4" />
            Request Through Praetoria
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            asChild
          >
            <a href={PARTNER_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Visit Partner Website
            </a>
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Praetoria coordinates and recommends this service. {PARTNER_NAME} is an independent trusted partner.
        </p>
      </DialogContent>
    </Dialog>
  );
}
