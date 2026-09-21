"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TimePart = "hours" | "minutes";
const DIAL_SIZE = 256;
const CENTER = DIAL_SIZE / 2;
const RADIUS = 100;
const pad = (value: number) => String(value).padStart(2, "0");

export function TimePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [part, setPart] = React.useState<TimePart>("hours");
  const [hours, minutes] = value.split(":").map(Number);
  const hour12 = hours % 12 || 12;
  const isPm = hours >= 12;
  const selected = part === "hours" ? hour12 : minutes;
  const angle = ((part === "hours" ? hour12 * 5 : minutes) / 60) * Math.PI * 2;
  const handX = CENTER + Math.sin(angle) * RADIUS;
  const handY = CENTER - Math.cos(angle) * RADIUS;

  function select(next: number) {
    onChange(part === "hours"
      ? `${pad((next % 12) + (isPm ? 12 : 0))}:${pad(minutes)}`
      : `${pad(hours)}:${pad(next)}`);
  }

  function selectAtPointer(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(x, y) < bounds.width * 0.1) return;
    const turns = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
    const steps = part === "hours" ? 12 : 60;
    const next = Math.round(turns * steps) % steps;
    select(part === "hours" ? next || 12 : next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const max = part === "hours" ? 12 : 59;
    const min = part === "hours" ? 1 : 0;
    let next = selected;
    switch (event.key) {
      case "ArrowUp": case "ArrowRight": next += 1; break;
      case "ArrowDown": case "ArrowLeft": next -= 1; break;
      case "Home": next = min; break;
      case "End": next = max; break;
      case "Enter": case " ":
        event.preventDefault();
        setPart(part === "hours" ? "minutes" : "hours");
        return;
      default: return;
    }
    event.preventDefault();
    select(next > max ? min : next < min ? max : next);
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4 disabled:opacity-50">
      <legend className="mb-3 text-sm font-medium">Notification time</legend>
      <div className="flex items-start justify-center gap-3">
        <div className="flex items-start gap-1">
          {(["hours", "minutes"] as const).map((item, index) => (
            <React.Fragment key={item}>
              {index === 1 && <span className="pt-1 text-4xl" aria-hidden="true">:</span>}
              <div className="space-y-1 text-center">
                <button
                  type="button"
                  aria-label={`Select ${item}, ${item === "hours" ? hour12 : pad(minutes)}`}
                  aria-pressed={part === item}
                  onClick={() => setPart(item)}
                  className={cn(
                    "h-16 w-20 rounded-xl text-4xl tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    part === item ? "bg-primary/15 text-foreground ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item === "hours" ? pad(hour12) : pad(minutes)}
                </button>
                <p className="text-xs text-muted-foreground">{item === "hours" ? "Hour" : "Minute"}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex h-16 flex-col overflow-hidden rounded-lg border" aria-label="Time period" role="group">
          {[false, true].map((pm) => (
            <button
              key={String(pm)}
              type="button"
              aria-pressed={isPm === pm}
              onClick={() => onChange(`${pad(hours % 12 + (pm ? 12 : 0))}:${pad(minutes)}`)}
              className={cn("flex-1 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", isPm === pm ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              {pm ? "PM" : "AM"}
            </button>
          ))}
        </div>
      </div>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={part === "hours" ? "Hour" : "Minute"}
        aria-valuemin={part === "hours" ? 1 : 0}
        aria-valuemax={part === "hours" ? 12 : 59}
        aria-valuenow={selected}
        aria-valuetext={part === "hours" ? `${hour12} ${isPm ? "PM" : "AM"}` : `${minutes} minutes`}
        aria-disabled={disabled}
        onKeyDown={disabled ? undefined : handleKeyDown}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          selectAtPointer(event);
        }}
        onPointerMove={(event) => {
          if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId)) selectAtPointer(event);
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          if (!disabled) {
            selectAtPointer(event);
            if (part === "hours") setPart("minutes");
          }
        }}
        className="relative mx-auto aspect-square w-full max-w-64 touch-none select-none rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <svg viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} className="size-full" aria-hidden="true">
          <line x1={CENTER} y1={CENTER} x2={handX} y2={handY} stroke="currentColor" strokeWidth="2" className="text-primary" />
          <circle cx={CENTER} cy={CENTER} r="4" className="fill-primary" />
          <circle cx={handX} cy={handY} r="20" className="fill-primary" />
          {Array.from({ length: 12 }, (_, index) => {
            const number = part === "hours" ? index || 12 : index * 5;
            const radians = (index / 12) * Math.PI * 2;
            return (
              <text
                key={index}
                x={CENTER + Math.sin(radians) * RADIUS}
                y={CENTER - Math.cos(radians) * RADIUS}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn("text-sm", selected === number ? "fill-primary-foreground" : "fill-foreground")}
              >
                {part === "hours" ? number : pad(number)}
              </text>
            );
          })}
          {part === "minutes" && minutes % 5 !== 0 && <circle cx={handX} cy={handY} r="3" className="fill-primary-foreground" />}
        </svg>
      </div>
    </fieldset>
  );
}
