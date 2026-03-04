"use client";

import * as React from "react";
import { updateSellerAction, getClassesAction } from "@/lib/actions/admin";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Seller {
  id: string;
  name: string;
  email: string;
  balance: string;
  maxDebt: string;
  class: string | null;
}

interface Class {
  name: string;
  username: string;
  createdAt: Date | null;
}

interface SellerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller: Seller | null;
  onUpdated: () => void;
  onCreateClass: (name: string) => void;
}

export function SellerEditDialog({
  open,
  onOpenChange,
  seller,
  onUpdated,
  onCreateClass,
}: SellerEditDialogProps) {
  const [maxDebt, setMaxDebt] = React.useState("0");
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [classPopoverOpen, setClassPopoverOpen] = React.useState(false);

  const loadClasses = React.useCallback(async () => {
    const result = await getClassesAction();
    if ("classes" in result) {
      setClasses(result.classes);
    }
  }, []);

  React.useEffect(() => {
    if (open && seller) {
      setMaxDebt(seller.maxDebt);
      setSelectedClass(seller.class);
      loadClasses();
    }
  }, [open, seller, loadClasses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    setIsLoading(true);

    const result = await updateSellerAction(seller.id, maxDebt, selectedClass);

    if ("error" in result && result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    toast.success("Seller updated successfully");
    onUpdated();
    onOpenChange(false);
  };

  const handleCreateNewClass = (inputValue: string) => {
    setClassPopoverOpen(false);
    onCreateClass(inputValue);
  };

  if (!seller) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Seller</DialogTitle>
          <DialogDescription>
            Update {seller.name}&apos;s class and maximum debt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Popover open={classPopoverOpen} onOpenChange={setClassPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedClass || "Select class..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search class..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const inputValue = (e.target as HTMLInputElement).value;
                          if (inputValue && !classes.find((c) => c.name === inputValue)) {
                            e.preventDefault();
                            handleCreateNewClass(inputValue);
                          }
                        }
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            const input = document.querySelector(
                              '[cmdk-input]'
                            ) as HTMLInputElement;
                            if (input?.value) {
                              handleCreateNewClass(input.value);
                            }
                          }}
                        >
                          Create new class
                        </button>
                      </CommandEmpty>
                      <CommandGroup>
                        {classes.map((cls) => (
                          <CommandItem
                            key={cls.name}
                            value={cls.name}
                            onSelect={(currentValue) => {
                              setSelectedClass(currentValue === selectedClass ? null : currentValue);
                              setClassPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClass === cls.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cls.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDebt">Maximum Debt</Label>
              <Input
                id="maxDebt"
                type="number"
                step="0.01"
                min="0"
                value={maxDebt}
                onChange={(e) => setMaxDebt(e.target.value)}
                required
              />
            </div>
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
