"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Popover, PopoverContent, PopoverAnchor } from "@ui/components/popover";
import {
  Heading,
  Type,
  Car,
  Percent,
} from "lucide-react";

// Define types compatible with UniversalLineItemRow
export type SlashMenuBlockType = "CALCULATED" | "MANUAL" | "GROUP" | "DISCOUNT";

export interface SlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: SlashMenuBlockType) => void;
  anchorRect: DOMRect | null;
}

const SLASH_MENU_ITEMS = [
  {
    label: "Text",
    icon: Type,
    type: "MANUAL" as const,
    description: "Just plain text",
  },
  {
    label: "Heading",
    icon: Heading,
    type: "GROUP" as const,
    description: "Section header",
  },
  {
      label: "Service",
      icon: Car,
      type: "CALCULATED" as const,
      description: "Linked to pricing engine",
  },
  {
      label: "Discount",
      icon: Percent,
      type: "DISCOUNT" as const, // Handled specially in parent
      description: "Apply a discount",
  }
];

export function SlashMenu({ isOpen, onClose, onSelect, anchorRect }: SlashMenuProps) {
  const [search, setSearch] = useState("");




  // Virtual ref for Popover positioning
  const virtualRef = React.useRef({
    getBoundingClientRect: () => anchorRect || new DOMRect(),
  });

  useEffect(() => {
    virtualRef.current = {
      getBoundingClientRect: () => anchorRect || new DOMRect(),
    };
  }, [anchorRect]);

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent 
        className="p-0 w-[240px] overflow-hidden" 
        side="bottom" 
        align="start"
        // Avoid auto-focusing the content wrapper itself, we want the Command input
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command 
             className="w-full bg-white dark:bg-slate-950"
             loop
             onKeyDown={(e) => {
                if (e.key === 'Escape') handleClose();
             }}
        >
          <Command.Input 
             value={search}
             onValueChange={setSearch}
             className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 px-3 border-b border-gray-100 dark:border-gray-800"
             placeholder="Filter blocks..."
             autoFocus 
          />
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Basic Blocks" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {SLASH_MENU_ITEMS.map((item) => (
                <Command.Item
                  key={item.label}
                  value={item.label}
                  onSelect={() => {
                      onSelect(item.type);
                      handleClose();
                  }}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800 data-[selected=true]:text-slate-900 dark:data-[selected=true]:text-slate-100"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.description}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
