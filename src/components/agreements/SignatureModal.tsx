import { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, PenTool, Upload, Eraser } from 'lucide-react';
import { toast } from 'sonner';

export interface SignatureValue {
  type: 'typed' | 'drawn' | 'uploaded';
  value: string; // typed name, or data URL
}

export function serializeSignature(sig: SignatureValue): string {
  return JSON.stringify(sig);
}

export function parseSignature(raw?: string | boolean | null): SignatureValue | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.value) return parsed as SignatureValue;
  } catch {
    return { type: 'typed', value: raw };
  }
  return null;
}

export function SignaturePreview({ sig, className = '' }: { sig: SignatureValue | null; className?: string }) {
  if (!sig) return null;
  if (sig.type === 'typed') {
    return (
      <span className={`text-3xl leading-tight ${className}`} style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}>
        {sig.value}
      </span>
    );
  }
  return <img src={sig.value} alt="Signature" className={`max-h-20 object-contain ${className}`} />;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName?: string;
  allowUpload?: boolean;
  title?: string;
  onAdopt: (sig: SignatureValue) => void;
}

export function SignatureModal({ open, onOpenChange, defaultName = '', allowUpload = true, title = 'Adopt Your Signature', onAdopt }: Props) {
  const [tab, setTab] = useState<'typed' | 'drawn' | 'uploaded'>('typed');
  const [typed, setTyped] = useState(defaultName);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    if (open) {
      setTyped(defaultName);
      setUploaded(null);
      hasDrawnRef.current = false;
    }
  }, [open, defaultName]);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const anyE = e as any;
    const cx = anyE.touches ? anyE.touches[0].clientX : anyE.clientX;
    const cy = anyE.touches ? anyE.touches[0].clientY : anyE.clientY;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasDrawnRef.current = true;
  };

  const end = () => { drawingRef.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const handleUpload = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Signature image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setUploaded(String(reader.result));
    reader.readAsDataURL(file);
  };

  const adopt = () => {
    if (tab === 'typed') {
      if (!typed.trim()) { toast.error('Please type your name'); return; }
      onAdopt({ type: 'typed', value: typed.trim() });
    } else if (tab === 'drawn') {
      if (!hasDrawnRef.current) { toast.error('Please draw your signature'); return; }
      onAdopt({ type: 'drawn', value: canvasRef.current!.toDataURL('image/png') });
    } else {
      if (!uploaded) { toast.error('Please upload a signature image'); return; }
      onAdopt({ type: 'uploaded', value: uploaded });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose how you would like to sign. Your signature will be applied to the highlighted field.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className={`grid w-full ${allowUpload ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="typed"><Type className="h-4 w-4 mr-1" /> Type</TabsTrigger>
            <TabsTrigger value="drawn"><PenTool className="h-4 w-4 mr-1" /> Draw</TabsTrigger>
            {allowUpload && <TabsTrigger value="uploaded"><Upload className="h-4 w-4 mr-1" /> Upload</TabsTrigger>}
          </TabsList>

          <TabsContent value="typed" className="mt-4 space-y-3">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your full legal name" autoFocus />
            <div className="rounded-lg border bg-card p-6 text-center min-h-[96px] flex items-center justify-center">
              <SignaturePreview sig={typed.trim() ? { type: 'typed', value: typed.trim() } : null} />
            </div>
          </TabsContent>

          <TabsContent value="drawn" className="mt-4 space-y-2">
            <div className="rounded-lg border-2 border-dashed bg-card">
              <canvas
                ref={canvasRef}
                width={640}
                height={200}
                className="w-full h-[160px] touch-none cursor-crosshair"
                onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                onTouchStart={start} onTouchMove={move} onTouchEnd={end}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clear}><Eraser className="h-4 w-4 mr-1" /> Clear</Button>
          </TabsContent>

          {allowUpload && (
            <TabsContent value="uploaded" className="mt-4 space-y-3">
              <Input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])} />
              {uploaded && (
                <div className="rounded-lg border bg-card p-4 flex justify-center">
                  <img src={uploaded} alt="Uploaded signature" className="max-h-24 object-contain" />
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={adopt}>Adopt Signature</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
