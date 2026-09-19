import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  ArrowRight,
  MessageSquareDashed,
  MessageSquare,
} from "lucide-react";

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
    price: "3 KM",
    period: "/month",
    yearlyPrice: "24 KM",
    yearlyPeriod: "/year",
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

export default function PricingPage() {
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
                  "relative p-6 rounded-xl border bg-card",
                  plan.popular && "border-primary shadow-lg scale-105",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <div className="mt-2">
                      <span className="text-lg font-semibold">
                        {plan.yearlyPrice}
                      </span>
                      <span className="text-muted-foreground">
                        {plan.yearlyPeriod}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
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
                      ) : (
                        <Check
                          className={cn(
                            "size-4",
                            feature.included
                              ? "text-primary"
                              : "text-muted-foreground opacity-50",
                          )}
                        />
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
            Purchase subscription codes from your class seller to upgrade your
            plan.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Never Miss a Deadline?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join other students who never miss an exam or assignment.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
