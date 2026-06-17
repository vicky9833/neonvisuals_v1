"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { OCCASION_TYPES } from "@/lib/utils/constants";

const QUICK_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Gift Builder", href: "/gift-builder" },
  { label: "Get a Quote", href: "/get-quote" },
  { label: "Pricing", href: "/pricing" },
];

/** Global ⌘K / Ctrl+K search palette. */
export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search occasions, products, pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick links">
          {QUICK_LINKS.map((link) => (
            <CommandItem key={link.href} onSelect={() => go(link.href)}>
              {link.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Occasions">
          {OCCASION_TYPES.map((occasion) => (
            <CommandItem
              key={occasion.slug}
              onSelect={() => go(`/occasions/${occasion.slug}`)}
            >
              {occasion.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
