import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalPinRecord, useSetPin, useVerifyPin, useSessionUnlock } from '@/hooks/usePersonalAccountsPin';

interface Props {
  ownerEmail?: string;
  onUnlocked: () => void;
}

export default function PersonalPinGate({ ownerEmail, onUnlocked }: Props) {
  const pinQ = usePersonalPinRecord();
  const setPinM = useSetPin();
  const verifyM = useVerifyPin();
  const { unlock } = useSessionUnlock();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [pinQ.isLoading]);

  if (pinQ.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading vault…</div>;
  }

  const hasPin = !!pinQ.data;
  const lockedUntil = pinQ.data?.locked_until ? new Date(pinQ.data.locked_until) : null;
  const isLocked = lockedUntil && lockedUntil > new Date();
  const minsLeft = isLocked ? Math.ceil((lockedUntil!.getTime() - Date.now()) / 60000) : 0;

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleSet = async () => {
    if (!/^\d{4}$/.test(pin)) { toast.error('PIN must be 4 digits'); triggerShake(); return; }
    if (pin !== confirmPin) { toast.error('PINs do not match'); triggerShake(); return; }
    try {
      await setPinM.mutateAsync(pin);
      unlock();
      toast.success('PIN set. Vault unlocked.');
      onUnlocked();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleVerify = async () => {
    if (!/^\d{4}$/.test(pin)) { toast.error('Enter your 4-digit PIN'); triggerShake(); return; }
    try {
      await verifyM.mutateAsync(pin);
      unlock();
      toast.success('Unlocked');
      onUnlocked();
    } catch (e: any) {
      toast.error(e.message);
      triggerShake();
      setPin('');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className={`w-full max-w-md border-2 border-primary/20 shadow-xl ${shake ? 'animate-shake' : ''}`}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {hasPin ? <Lock className="h-7 w-7 text-primary" /> : <KeyRound className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-xl">
            {hasPin ? 'Enter your PIN' : 'Set your 4-digit PIN'}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{ownerEmail}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {!hasPin && (
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>One-time setup.</strong> Choose a 4-digit PIN you'll remember. You'll enter it each time you open this vault. We store only a hashed version — no one (not even an admin) can read your PIN.
            </div>
          )}

          {isLocked ? (
            <div className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-900 text-center">
              <ShieldCheck className="h-5 w-5 mx-auto mb-1" />
              Locked for security. Try again in <strong>{minsLeft} minute(s)</strong>.
            </div>
          ) : (
            <>
              <div>
                <Label>{hasPin ? 'PIN' : 'New PIN'}</Label>
                <Input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && (hasPin ? handleVerify() : confirmPin && handleSet())}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>

              {!hasPin && (
                <div>
                  <Label>Confirm PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSet()}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                    placeholder="••••"
                    autoComplete="off"
                  />
                </div>
              )}

              <Button
                onClick={hasPin ? handleVerify : handleSet}
                disabled={setPinM.isPending || verifyM.isPending}
                className="w-full h-12"
              >
                {hasPin ? 'Unlock Vault' : 'Set PIN & Unlock'}
              </Button>

              {hasPin && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Auto-relocks after 15 minutes. 5 wrong attempts = 5-minute lockout.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
