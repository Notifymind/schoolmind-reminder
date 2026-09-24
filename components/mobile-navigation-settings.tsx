"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, GripVertical, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { placeNavigationPage } from "@/lib/mobile-navigation";
import { cn } from "@/lib/utils";

type Drag = { href: string; x: number; y: number; moved: boolean };

export function MobileNavigationSettings() {
  const { pages, selected, setSelected, appearance, setAppearance, ready } = useMobileNavigation();
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<Drag | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const chosen = selected.flatMap(href => pages.filter(page => page.href === href));
  const selectedSet = new Set(selected);
  const available = pages.filter(page => !selectedSet.has(page.href));

  function save(next: string[]) {
    if (!setSelected(next)) toast.error("Could not save navigation. Check your browser storage settings.");
    else setAnnouncement("Navigation updated.");
  }
  function dropTarget(x: number, y: number) {
    return document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-nav-drop]");
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
    const drop = dropTarget(event.clientX, event.clientY);
    setTarget(drop?.dataset.navDrop ?? null);
    const scroller = drop?.closest<HTMLElement>("[data-nav-scroll]");
    if (scroller) {
      const bounds = scroller.getBoundingClientRect();
      if (event.clientX > bounds.right - 36) scroller.scrollLeft += 16;
      else if (event.clientX < bounds.left + 36) scroller.scrollLeft -= 16;
    }
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.moved) {
      const drop = dropTarget(event.clientX, event.clientY)?.dataset.navDrop;
      if (drop === "remove") save(selected.filter(href => href !== current.href));
      else if (drop) save(placeNavigationPage(selected, current.href, drop === "append" ? undefined : drop));
    }
    setPreview(null);
    setTarget(null);
    // Keep the moved flag until the click that follows pointerup has been handled.
  }
  function cancel() {
    drag.current = null;
    setPreview(null);
    setTarget(null);
  }
  function tile(page: (typeof pages)[number], inBar: boolean) {
    const Icon = page.icon;
    return (
      <button type="button" disabled={!ready}
        aria-label={inBar ? `Drag ${page.title} to reorder or remove` : `Add ${page.title} to navbar`}
        title={page.title}
        onPointerDown={event => start(event, page.href)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}
        onClick={() => {
          const moved = drag.current?.moved;
          drag.current = null;
          if (!moved && !inBar) save(placeNavigationPage(selected, page.href));
        }}
        className="flex min-h-14 w-full touch-none select-none flex-col items-center justify-center gap-1 rounded-lg p-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 cursor-grab active:cursor-grabbing">
        <span className="flex items-center gap-1"><GripVertical aria-hidden="true" className="size-3 text-muted-foreground" /><Icon aria-hidden="true" className="size-5" /></span>
        {(!inBar || appearance.showLabels) && <span className="whitespace-nowrap text-xs">{page.title}</span>}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Build your mobile navbar</CardTitle>
          <CardDescription>Drag pages into the navbar below. Drag to reorder, or back to Available pages to remove. You can also tap a page to add it and use the arrow and remove buttons. Changes save in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <h2 className="text-sm font-medium">Navbar preview</h2>
          <div className={cn("bg-muted/30", appearance.floating ? "rounded-2xl border p-2 shadow-md" : "border-y p-2")}>
            <div className="flex items-center gap-1">
              <div data-nav-scroll data-nav-drop="append" className={cn("flex min-h-24 min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-dashed p-1", target === "append" && "border-primary bg-primary/10")}>
                {chosen.map((page, index) => (
                  <div key={page.href} data-nav-drop={page.href} className={cn("shrink-0 rounded-lg border-l-2 border-transparent", target === page.href && "border-primary bg-primary/10")}>
                    {tile(page, true)}
                    <div className="flex justify-center">
                      <button type="button" disabled={!ready || index === 0} aria-label={`Move ${page.title} left`} onClick={() => save(placeNavigationPage(selected, page.href, chosen[index - 1].href))} className="flex size-8 items-center justify-center rounded hover:bg-accent disabled:opacity-30"><ArrowLeft className="size-3" /></button>
                      <button type="button" disabled={!ready} aria-label={`Remove ${page.title}`} onClick={() => save(selected.filter(href => href !== page.href))} className="flex size-8 items-center justify-center rounded hover:bg-accent"><X className="size-3" /></button>
                      <button type="button" disabled={!ready || index === chosen.length - 1} aria-label={`Move ${page.title} right`} onClick={() => save(placeNavigationPage(selected, page.href, chosen[index + 2]?.href))} className="flex size-8 items-center justify-center rounded hover:bg-accent disabled:opacity-30"><ArrowRight className="size-3" /></button>
                    </div>
                  </div>
                ))}
                <span data-nav-drop="append" className="shrink-0 px-3 py-5 text-xs text-muted-foreground">Drop here</span>
              </div>
              <div className="flex w-14 shrink-0 flex-col items-center gap-1" aria-label="Menu, always included">
                <Menu aria-hidden="true" className="size-5" />
                {appearance.showLabels && <span className="text-xs">Menu</span>}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Menu always stays in the navbar. Scroll the preview to reach more pages.</p>
          <section data-nav-drop="remove" className={cn("rounded-xl border border-dashed p-3", target === "remove" && "border-primary bg-primary/10")}>
            <h2 className="mb-3 text-sm font-medium">Available pages</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {available.map(page => <div key={page.href} className="min-w-0 overflow-x-auto rounded-lg border">{tile(page, false)}</div>)}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Drop a navbar item here to remove it.</p>
          </section>
          <p role="status" className="sr-only">{announcement}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Navbar appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([{ key: "showLabels", title: "Show descriptions", description: "Show page names beneath the icons." }, { key: "floating", title: "Floating navbar", description: "Leave space around the navbar. Turn off to dock it to the bottom edge." }] as const).map(option => (
            <label key={option.key} className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" disabled={!ready} checked={appearance[option.key]} onChange={event => {
                if (!setAppearance({ ...appearance, [option.key]: event.target.checked })) toast.error("Could not save navbar appearance.");
              }} className="mt-1 size-4 accent-primary" />
              <span><span className="block text-sm font-medium">{option.title}</span><span className="text-sm text-muted-foreground">{option.description}</span></span>
            </label>
          ))}
        </CardContent>
      </Card>
      {preview && <div aria-hidden="true" className="pointer-events-none fixed z-[100] rounded-lg border bg-background px-3 py-2 text-sm shadow-xl" style={{ left: preview.x + 12, top: preview.y + 12 }}>{pages.find(page => page.href === preview.href)?.title}</div>}
    </div>
  );
}
