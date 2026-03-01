"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { getClassesAction, deleteClassAction } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Plus, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { AddClassDialog } from "@/components/add-class-dialog";
import { EditClassDialog } from "@/components/edit-class-dialog";

interface Class {
  name: string;
  username: string;
  createdAt: Date | null;
}

export default function AdminClassesPage() {
  usePageTitle("Classes");
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [addClassDialogOpen, setAddClassDialogOpen] = React.useState(false);
  const [editClassDialogOpen, setEditClassDialogOpen] = React.useState(false);
  const [selectedClass, setSelectedClass] = React.useState<Class | null>(null);

  const loadClasses = React.useCallback(async () => {
    setIsLoading(true);
    const result = await getClassesAction();
    if ("classes" in result) {
      setClasses(result.classes ?? []);
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleClassCreated = () => {
    loadClasses();
    setAddClassDialogOpen(false);
  };

  const handleEditClick = (cls: Class) => {
    setSelectedClass(cls);
    setEditClassDialogOpen(true);
  };

  const handleDeleteClick = async (cls: Class) => {
    if (!confirm(`Are you sure you want to delete "${cls.name}"?`)) {
      return;
    }
    const result = await deleteClassAction(cls.name);
    if ("error" in result && result.error) {
      alert(result.error);
      return;
    }
    loadClasses();
  };

  const handleClassUpdated = () => {
    loadClasses();
    setEditClassDialogOpen(false);
    setSelectedClass(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-muted-foreground">
            Manage school classes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            All Classes
          </CardTitle>
          <Button size="sm" onClick={() => setAddClassDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No classes found.</p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <div
                  key={cls.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <p className="font-medium">{cls.name}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(cls)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(cls)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddClassDialog
        open={addClassDialogOpen}
        onOpenChange={setAddClassDialogOpen}
        onClassCreated={handleClassCreated}
      />

      <EditClassDialog
        open={editClassDialogOpen}
        onOpenChange={setEditClassDialogOpen}
        onClassUpdated={handleClassUpdated}
        classData={selectedClass}
      />
    </div>
  );
}
