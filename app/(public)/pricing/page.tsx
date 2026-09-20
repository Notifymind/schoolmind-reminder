import { getProPlansAction } from "@/lib/actions/billing-options";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ProPriceCarousel } from "@/components/pro-price-carousel";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  MessageSquareDashed,
  MessageSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing - NotifyMind",
  description: "Choose the plan that works best for you. Simple pricing for smart reminders.",
};

const pricingPlans = [
  {
    name: "Free",
    price: "0 KM",
    period: "/month",
    yearlyPrice: "0 KM",
    yearlyPeriod: "/year",
    description: "Perfect for exam preparation",
    features: [
      { text: "Exam access", included: true },
      { text: "Assignment access", included: false },
      { text: "Push notifications", included: true },
      { text: "notification preset", number: "1", included: true, icon: "preset" },
      { text: "notifications per preset", number: "2", included: true, icon: "notifications" },
    ],
    cta: "Get Started",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    description: "Full access to all features",
    features: [
      { text: "Exam access", included: true },
      { text: "Assignment access", included: true },
      { text: "Push notifications", included: true },
      { text: "notification presets", number: "5", included: true, icon: "preset" },
      { text: "notifications per preset", number: "10", included: true, icon: "notifications" },
    ],
    cta: "Get Started",
    href: "/register",
    popular: true,
  },
];

export default async function PricingPage() {
  const proOptions = await getProPlansAction();
  return (
    <>
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Simple Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for you
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative grid min-w-0 grid-cols-1 gap-6 p-6 rounded-xl border bg-card md:row-span-3 md:grid-rows-subgrid",
                  plan.popular && "border-primary shadow-lg scale-105",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex flex-col text-center">
                  <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                  {plan.name === "Pro" ? (
                    <ProPriceCarousel options={proOptions} />
                  ) : (
                    <div className="flex flex-col gap-2 py-3">
                      <p className="text-sm font-medium">Always free</p>
                      <p className="text-4xl font-bold tracking-tight">
                        0 <span className="text-xl">KM</span>
                      </p>
                      <p className="text-sm text-muted-foreground">/ month</p>
                    </div>
                  )}
                  <p className="mt-auto pt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {feature.icon === "preset" ? (
                        plan.popular ? (
                          <MessageSquare
                            className={cn(
                              "size-4",
                              feature.included
                                ? "text-primary"
                                : "text-muted-foreground opacity-50",
                            )}
                          />
                        ) : (
                          <MessageSquareDashed
                            className={cn(
                              "size-4",
                              feature.included
                                ? "text-primary"
                                : "text-muted-foreground opacity-50",
                            )}
                          />
                        )
                      ) : feature.icon === "notifications" ? (
                        plan.popular ? (
                          <MessageSquare
                            className={cn(
                              "size-4",
                              feature.included
                                ? "text-primary"
                                : "text-muted-foreground opacity-50",
                            )}
                          />
                        ) : (
                          <MessageSquareDashed
                            className={cn(
                              "size-4",
                              feature.included
                                ? "text-primary"
                                : "text-muted-foreground opacity-50",
                            )}
                          />
                        )
                      ) : feature.included ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <X className="size-4 text-muted-foreground opacity-50" />
                      )}
                      <span
                        className={cn(
                          !feature.included &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {feature.number && <span>{feature.number} </span>}
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Buy gift cards from your class seller, add them to your balance, and subscribe to Pro.
            Your plan renews automatically while your balance covers the cost.
          </p>
        </div>
      </section>
    </>
  );
}
