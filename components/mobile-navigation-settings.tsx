"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Check, GripHorizontal, Menu, PanelBottom, RotateCcw, Type } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { BackToSettings } from "@/components/back-to-settings";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { defaultMobilePages, parseNavigationAppearance, placeNavigationPage } from "@/lib/mobile-navigation";
import { cn } from "@/lib/utils";

type Drag = { href: string; x: number; y: number; moved: boolean };
type Drop = { href: string; after: boolean };

export function MobileNavigationSettings() {
  const { pages, selected, setSelected, appearance, setAppearance, ready } = useMobileNavigation();
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<Drag | null>(null);
  const [target, setTarget] = useState<Drop | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const chosen = selected.flatMap(href => pages.filter(page => page.href === href));
  const selectedSet = new Set(selected);
  const available = pages.filter(page => !selectedSet.has(page.href));

  function save(next: string[]) {
    if (!setSelected(next)) toast.error("Could not save navigation. Check your browser storage settings.");
    else setAnnouncement("Navigation updated.");
  }
  function dropTarget(x: number, y: number): Drop | null {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-nav-row]");
    if (!row?.dataset.navRow) return null;
    const bounds = row.getBoundingClientRect();
    return { href: row.dataset.navRow, after: y > bounds.top + bounds.height / 2 };
  }
  function start(event: PointerEvent<HTMLButtonElement>, href: string) {
    if (!ready || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { href, x: event.clientX, y: event.clientY, moved: false };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
    current.moved = true;
    setPreview({ ...current, x: event.clientX, y: event.clientY });
    setTarget(dropTarget(event.clientX, event.clientY));
  }
  function cancel() {
    drag.current = null;
    setPreview(null);
    setTarget(null);
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    const drop = dropTarget(event.clientX, event.clientY);
    if (current?.moved && drop && drop.href !== current.href) {
      const before = drop.after ? selected[selected.indexOf(drop.href) + 1] : drop.href;
      save(placeNavigationPage(selected, current.href, before));
    }
    cancel();
  }
  function reset() {
    const savedPages = setSelected(defaultMobilePages);
    const savedAppearance = setAppearance(parseNavigationAppearance(null));
    if (savedPages && savedAppearance) setAnnouncement("Navigation reset to defaults.");
    else toast.error("Could not reset navigation. Check your browser storage settings.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Navigation</h1>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" disabled={!ready} onClick={reset} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
            <RotateCcw aria-hidden="true" className="size-4" />Reset
          </button>
          <BackToSettings />
        </div>
      </div>

      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <div className="bg-muted/20 px-4 py-6 sm:px-6 sm:py-8">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">Your navbar</p>
          <div aria-label="Navbar preview" className={cn("bg-background/95 p-2", appearance.floating ? "rounded-2xl border shadow-lg shadow-black/5" : "border-y")}>
            <div className="flex h-16 items-center overflow-x-auto">
              {chosen.map(page => (
                <div key={page.href} title={page.title} className={cn("flex min-h-11 min-w-max shrink-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-muted-foreground", page.href === "/app/navigation" && "bg-primary/10 text-primary")}>
                  <page.icon aria-hidden="true" className="size-5" />
                  <span className={appearance.showLabels ? "whitespace-nowrap text-xs font-medium" : "sr-only"}>{page.title}</span>
                </div>
              ))}
              <div className="flex min-h-11 min-w-max shrink-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-muted-foreground">
                <Menu aria-hidden="true" className="size-5" />
                <span className={appearance.showLabels ? "text-xs font-medium" : "sr-only"}>Menu</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/60 border-y border-border/60 px-4 sm:px-6">
          {([
            { key: "showLabels", title: "Labels", icon: Type },
            { key: "floating", title: "Floating navbar", icon: PanelBottom },
          ] as const).map(option => (
            <label key={option.key} className="flex cursor-pointer items-center gap-3 py-5 sm:gap-4">
              <option.icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{option.title}</span>
              </span>
              <input type="checkbox" role="switch" aria-label={option.title} disabled={!ready} checked={appearance[option.key]} onChange={event => {
                if (!setAppearance({ ...appearance, [option.key]: event.target.checked })) toast.error("Could not save navbar appearance.");
              }} className="peer sr-only" />
              <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
            </label>
          ))}
        </div>

        <section aria-labelledby="navigation-tabs-heading" className="px-2 py-4 sm:px-4">
          <div className="px-2 pb-3 sm:px-2">
            <h2 id="navigation-tabs-heading" className="text-sm font-medium">Customize tabs</h2>
            <p id="navigation-reorder-help" className="sr-only">Tap to show or hide. Drag handles to reorder, or focus a handle and use the arrow keys.</p>
          </div>
          <ul>
            {chosen.map(page => (
              <li key={page.href} data-nav-row={page.href} className={cn("relative flex items-center rounded-lg transition-colors", preview?.href === page.href && "bg-muted opacity-50", target?.href === page.href && "bg-primary/5", target?.href === page.href && (target.after ? "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary" : "before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:bg-primary"))}>
                <button type="button" disabled={!ready} aria-pressed="true" aria-label={`Show ${page.title} in navbar`} onClick={() => save(selected.filter(href => href !== page.href))} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:gap-4">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check aria-hidden="true" className="size-4" strokeWidth={3} /></span>
                  {page.title}
                </button>
                <button type="button" disabled={!ready} aria-label={`Reorder ${page.title}`} aria-describedby="navigation-reorder-help" onPointerDown={event => start(event, page.href)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={event => {
                  const index = chosen.findIndex(item => item.href === page.href);
                  if (event.key === "ArrowUp" && index > 0) {
                    event.preventDefault();
                    save(placeNavigationPage(selected, page.href, chosen[index - 1].href));
                  } else if (event.key === "ArrowDown" && index < chosen.length - 1) {
                    event.preventDefault();
                    save(placeNavigationPage(selected, page.href, chosen[index + 2]?.href));
                  }
                }} className="flex size-11 shrink-0 touch-none select-none items-center justify-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 cursor-grab active:cursor-grabbing">
                  <GripHorizontal aria-hidden="true" className="size-5" />
                </button>
              </li>
            ))}
            <li className="flex min-h-16 items-center gap-3 px-2 text-sm font-medium sm:gap-4">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Check aria-hidden="true" className="size-4" strokeWidth={3} /></span>
              <span className="flex-1">Menu</span>
              <span className="pr-2 text-xs font-normal text-muted-foreground">Always shown</span>
            </li>
            {available.map(page => (
              <li key={page.href}>
                <button type="button" disabled={!ready} aria-pressed="false" aria-label={`Show ${page.title} in navbar`} onClick={() => save(placeNavigationPage(selected, page.href))} className="flex min-h-16 w-full items-center gap-3 rounded-lg px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:gap-4">
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/50" />
                  {page.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </Card>
      <p role="status" className="sr-only">{announcement}</p>
      {preview && <div aria-hidden="true" className="pointer-events-none fixed z-[100] rounded-lg border bg-background px-3 py-2 text-sm shadow-xl" style={{ left: preview.x + 12, top: preview.y + 12 }}>{pages.find(page => page.href === preview.href)?.title}</div>}
    </div>
  );
}
