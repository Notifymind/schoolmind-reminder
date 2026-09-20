"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProPlan } from "@/lib/billing";

export function ProPriceCarousel({ options, renderAction, disabled = false }: {
  options: ProPlan[];
  renderAction?: (option: ProPlan, moving: boolean) => ReactNode;
  disabled?: boolean;
}) {
  const [slide, setSlide] = useState({ index: 0, target: 0, direction: 0 });
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = options.length;
  const index = count ? slide.index % count : 0;
  const moving = slide.direction !== 0;

  function goTo(target: number, direction: number) {
    if (moving || disabled || count < 2 || target === index) return;
    setSlide({ index, target, direction });
  }

  useEffect(() => {
    if (count < 2 || paused || hovered || focused || disabled || moving) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setSlide({ index, target: (index + 1) % count, direction: 1 });
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [count, index, paused, hovered, focused, disabled, moving]);

  if (!count) {
    return <p className="py-6 text-sm text-muted-foreground">Pricing is currently unavailable.</p>;
  }

  const slots = count > 1 ? [
    slide.direction === -1 ? slide.target : (index - 1 + count) % count,
    index,
    slide.direction === 1 ? slide.target : (index + 1) % count,
  ] : [index];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Pro pricing options"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="mx-auto w-full max-w-xs">
        <div className="min-w-0 flex-1 touch-pan-y overflow-hidden"
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchCancel={() => { touchStart.current = null; }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            if (touchStart.current === null || !touch) return;
            const distance = touchStart.current - touch.clientX;
            touchStart.current = null;
            if (Math.abs(distance) > 40) {
              const direction = distance > 0 ? 1 : -1;
              goTo((index + direction + count) % count, direction);
            }
          }}>
          <div
            className={cn("flex", moving && "transition-transform duration-300 ease-out motion-reduce:duration-1")}
            style={{ transform: `translateX(${count > 1 ? -100 * (1 + slide.direction) : 0}%)` }}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === "transform") {
                setSlide(current => ({ index: current.target, target: current.target, direction: 0 }));
              }
            }}
          >
            {slots.map((optionIndex, slot) => {
              const option = options[optionIndex % count];
              return (
                <div key={slot} role="group" aria-roledescription="slide"
                  aria-label={`${optionIndex + 1} of ${count}: ${option.label}`}
                  aria-hidden={count > 1 && slot !== 1}
                  className="flex w-full shrink-0 flex-col items-center justify-center gap-2 px-1 py-2 text-center">
                  <div className="flex min-h-7 items-center justify-center">
                    {option.marketingText && (
                      <span className="max-w-full rounded-full bg-red-400/15 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-400/30 dark:text-red-300 break-words">
                        {option.marketingText}
                      </span>
                    )}
                  </div>
                  <p className="text-4xl font-bold tracking-tight break-words">
                    {option.price} <span className="text-xl">KM</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    / {option.duration} {option.duration === 1 ? option.unit.replace(/s$/, "") : option.unit}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      {count > 1 && (
        <div className="relative mx-auto mt-2 flex w-fit max-w-full items-center justify-center gap-1 px-9" aria-label="Choose a price option">
          <Button type="button" variant="ghost" size="icon" className="rounded-full"
            aria-label="Previous price option" disabled={disabled || moving}
            onClick={() => goTo((index - 1 + count) % count, -1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          {options.map((option, optionIndex) => (
            <button key={option.id} type="button" aria-label={`Show ${option.label}`}
              aria-current={optionIndex === index ? "true" : undefined}
              disabled={disabled || moving}
              onClick={() => goTo(optionIndex, optionIndex > index ? 1 : -1)}
              className="flex size-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className={cn("h-1.5 rounded-full motion-safe:transition-all", optionIndex === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
            </button>
          ))}

          <Button type="button" variant="ghost" size="icon" className="rounded-full"
            aria-label="Next price option" disabled={disabled || moving}
            onClick={() => goTo((index + 1) % count, 1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-0 rounded-full text-muted-foreground"
            aria-label={paused ? "Resume automatic scrolling" : "Pause automatic scrolling"}
            onClick={() => setPaused(current => !current)}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </Button>
        </div>
      )}
      {renderAction && <div className="mt-3">{renderAction(options[index], moving)}</div>}
    </div>
  );
}
