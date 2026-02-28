"use client";

import { usePageTitle } from "@/app/app/layout";
import { SubscriptionGate } from "@/components/subscription-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, BookOpen } from "lucide-react";

type Exam = {
  id: number;
  className: string;
  subject: string | null;
  title: string | null;
  date: string | null;
  time: string | null;
  type: string | null;
  description: string | null;
  dueDate: Date | null;
  createdAt: Date | null;
};

function ExamCard({ exam }: { exam: Exam }) {
  const getDaysText = () => {
    if (!exam.dueDate) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(exam.dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays > 1) return `In ${diffDays} days`
    return `${Math.abs(diffDays)} days ago`
  }

  const daysText = getDaysText()

  return (
    <Card className="gap-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {exam.title || "Untitled Exam"}
            </CardTitle>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <BookOpen className="size-4" />
                {exam.subject || "No subject"}
              </span>
              {exam.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  {exam.date}
                </span>
              )}
              {exam.time && (
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {exam.time}
                </span>
              )}
              {daysText && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {daysText}
                </span>
              )}
              {exam.type && (
                <span className="text-xs bg-primary/10 text-primary px-2 rounded-full">
                  {exam.type}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      {exam.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function ExamsClient({
  exams,
  hasClass,
  isLoggedIn,
}: {
  exams: Exam[];
  hasClass: boolean;
  isLoggedIn: boolean;
}) {
  usePageTitle("Exams");

  return (
    <SubscriptionGate>
      <div className="grid gap-4 w-full max-w-2xl mx-auto">
        {!isLoggedIn && (
          <p className="text-muted-foreground">Please log in to view exams.</p>
        )}
        {isLoggedIn && !hasClass && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              You haven&apos;t joined a class yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Join a class to see your exams.
            </p>
          </div>
        )}
        {isLoggedIn && hasClass && exams.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No exams scheduled yet.</p>
          </div>
        )}
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </div>
    </SubscriptionGate>
  );
}
