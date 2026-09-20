"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PriceOption = {
  id: string;
  label: string;
  price: string;
  duration: number;
  unit: string;
};

export function ProPriceCarousel({ options }: { options: PriceOption[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function goTo(index: number) {
    const element = viewport.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth });
  }

  if (options.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Pricing is currently unavailable.</p>;
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Pro pricing options">
      <div className="flex items-center gap-2">
        {options.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Previous price option"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div
          ref={viewport}
          className="flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.clientWidth > 0) {
              setActiveIndex(Math.round(element.scrollLeft / element.clientWidth));
            }
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${options.length}: ${option.label}`}
              className="flex w-full shrink-0 snap-center flex-col justify-center gap-2 px-1 py-3"
            >
              <p className="text-sm font-medium break-words">{option.label}</p>
              <p className="text-4xl font-bold tracking-tight break-words">
                {option.price} <span className="text-xl">KM</span>
              </p>
              <p className="text-sm text-muted-foreground">
                / {option.duration} {option.duration === 1 ? option.unit.replace(/s$/, "") : option.unit}
              </p>
            </div>
          ))}
        </div>
        {options.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Next price option"
            disabled={activeIndex === options.length - 1}
            onClick={() => goTo(activeIndex + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
      {options.length > 1 && (
        <div className="flex flex-wrap justify-center" aria-label="Choose a price option">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-label={`Show ${option.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goTo(index)}
              className="flex size-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn("h-1.5 rounded-full motion-safe:transition-all", index === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
            </button>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {options[activeIndex]?.label}, {options[activeIndex]?.price} KM, option {activeIndex + 1} of {options.length}
      </p>
    </div>
  );
}
