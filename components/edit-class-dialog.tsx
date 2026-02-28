"use client";

import * as React from "react";
import { updateClassAction } from "@/lib/actions/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassUpdated: () => void;
  classData: {
    name: string;
    username: string;
  } | null;
}

export function EditClassDialog({
  open,
  onOpenChange,
  onClassUpdated,
  classData,
}: EditClassDialogProps) {
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && classData) {
      setName(classData.name);
      setUsername(classData.username);
      setPassword("");
      setError(null);
    }
  }, [open, classData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;

    setIsLoading(true);
    setError(null);

    const result = await updateClassAction(classData.name, name, username, password);

    if ("error" in result && result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onClassUpdated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>Update the class details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editClassName">Class Name</Label>
              <Input
                id="editClassName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 9A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Class login username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">Password</Label>
              <Input
                id="editPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty to keep current"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
