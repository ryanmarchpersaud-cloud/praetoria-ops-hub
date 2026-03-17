import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function WorkerPlaceholder({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6">
      <h1 className="text-lg font-bold mb-4">{title}</h1>
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <Construction className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <p className="text-xs text-muted-foreground">This section is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
