import { useState } from 'react';
import { Check, ChevronsUpDown, X, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAssignableUsers } from '@/hooks/useOperationalTasks';

export type AssigneeValue = { user_id: string; assignee_type: 'worker' | 'subcontractor' };

interface Props {
  value: AssigneeValue[];
  onChange: (next: AssigneeValue[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AssigneeMultiSelect({ value, onChange, disabled, placeholder = 'Search workers & subcontractors…' }: Props) {
  const [open, setOpen] = useState(false);
  const { data: options = [], isLoading } = useAssignableUsers();

  const selectedMap = new Map(value.map(v => [v.user_id, v]));
  const selectedItems = options.filter(o => selectedMap.has(o.user_id));

  const toggle = (opt: (typeof options)[number]) => {
    if (selectedMap.has(opt.user_id)) {
      onChange(value.filter(v => v.user_id !== opt.user_id));
    } else {
      onChange([...value, { user_id: opt.user_id, assignee_type: opt.assignee_type }]);
    }
  };

  const remove = (userId: string) => onChange(value.filter(v => v.user_id !== userId));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {value.length > 0 ? `${value.length} assigned` : (isLoading ? 'Loading…' : 'Add assignees')}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup heading="Workers">
                {options.filter(o => o.assignee_type === 'worker').map(o => (
                  <CommandItem key={o.user_id} value={`${o.label} ${o.user_id}`} onSelect={() => toggle(o)}>
                    <Check className={cn('mr-2 h-4 w-4', selectedMap.has(o.user_id) ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex-1">
                      <div className="text-sm">{o.label}</div>
                      {o.sublabel && <div className="text-[10px] text-muted-foreground">{o.sublabel}</div>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Subcontractors">
                {options.filter(o => o.assignee_type === 'subcontractor').map(o => (
                  <CommandItem key={o.user_id} value={`${o.label} ${o.user_id}`} onSelect={() => toggle(o)}>
                    <Check className={cn('mr-2 h-4 w-4', selectedMap.has(o.user_id) ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex-1">
                      <div className="text-sm">{o.label}</div>
                      {o.sublabel && <div className="text-[10px] text-muted-foreground">{o.sublabel}</div>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map(item => (
            <Badge key={item.user_id} variant="secondary" className="pl-2 pr-1 py-0.5 gap-1">
              <span className="text-xs">{item.label}</span>
              <button
                type="button"
                onClick={() => remove(item.user_id)}
                className="rounded-full hover:bg-background/50 p-0.5"
                aria-label={`Remove ${item.label}`}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
