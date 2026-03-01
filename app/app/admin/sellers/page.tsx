"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import {
  searchUsersAction,
  getAllSellersAction,
  upgradeToSellerAction,
  removeSellerAction,
  getClassesAction,
} from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronsUpDown, Check, Pencil, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddClassDialog } from "@/components/add-class-dialog";
import { SellerEditDialog } from "@/components/seller-edit-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  class: string | null;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  balance: string;
  maxDebt: string;
  class: string | null;
  createdAt: Date | null;
}

interface Class {
  name: string;
  username: string;
  createdAt: Date | null;
}

export default function AdminSellersPage() {
  usePageTitle("Sellers Management");
  const [userSearch, setUserSearch] = React.useState("");
  const [searchedUsers, setSearchedUsers] = React.useState<User[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [userPopoverOpen, setUserPopoverOpen] = React.useState(false);
  const [sellers, setSellers] = React.useState<Seller[]>([]);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [maxDebt, setMaxDebt] = React.useState("0");
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [classPopoverOpen, setClassPopoverOpen] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  const [addClassDialogOpen, setAddClassDialogOpen] = React.useState(false);
  const [pendingClassName, setPendingClassName] = React.useState("");

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingSeller, setEditingSeller] = React.useState<Seller | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingSeller, setDeletingSeller] = React.useState<Seller | null>(null);

  const loadSellers = React.useCallback(async () => {
    const result = await getAllSellersAction();
    if ("sellers" in result) {
      setSellers(result.sellers ?? []);
    }
  }, []);

  const loadClasses = React.useCallback(async () => {
    const result = await getClassesAction();
    if ("classes" in result) {
      setClasses(result.classes ?? []);
    }
  }, []);

  React.useEffect(() => {
    Promise.all([loadSellers(), loadClasses()]).finally(() =>
      setIsInitialLoading(false)
    );
  }, [loadSellers, loadClasses]);

  React.useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (userSearch.length >= 1) {
        setIsSearching(true);
        const result = await searchUsersAction(userSearch);
        if ("users" in result) {
          setSearchedUsers(result.users ?? []);
        }
        setIsSearching(false);
      } else {
        setSearchedUsers([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [userSearch]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearch("");
    setSearchedUsers([]);
    setUserPopoverOpen(false);
    setMaxDebt("0");
    setSelectedClass(user.class);
  };

  const handleConfirmClick = () => {
    if (selectedUser) {
      setAddDialogOpen(true);
    }
  };

  const handleCreateNewClass = (inputValue: string) => {
    setClassPopoverOpen(false);
    setPendingClassName(inputValue);
    setAddClassDialogOpen(true);
  };

  const handleClassCreated = (className: string) => {
    loadClasses();
    setSelectedClass(className);
    setAddClassDialogOpen(false);
  };

  const handleAddSeller = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    setAddError(null);

    const result = await upgradeToSellerAction(
      selectedUser.id,
      maxDebt,
      selectedClass
    );

    if ("error" in result && result.error) {
      setAddError(result.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setAddDialogOpen(false);
    setSelectedUser(null);
    loadSellers();
  };

  const handleEditClick = (seller: Seller) => {
    setEditingSeller(seller);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (seller: Seller) => {
    setDeletingSeller(seller);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSeller) return;

    setIsLoading(true);
    const result = await removeSellerAction(deletingSeller.id);

    if ("error" in result && result.error) {
      alert(result.error);
    } else {
      loadSellers();
    }

    setIsLoading(false);
    setDeleteDialogOpen(false);
    setDeletingSeller(null);
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-12" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sellers Management</h1>
          <p className="text-muted-foreground">
            Add and manage seller accounts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Seller
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Search User by Name or Email</Label>
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedUser
                      ? `${selectedUser.name} (${selectedUser.email})`
                      : "Search users..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Type to search..."
                      value={userSearch}
                      onValueChange={setUserSearch}
                    />
                    <CommandList>
                      {isSearching ? (
                        <div className="py-6 text-center text-sm">Searching...</div>
                      ) : (
                        <>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {searchedUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email}`}
                                onSelect={() => handleUserSelect(user)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUser?.id === user.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div>
                                  <div>{user.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.email} ({user.role})
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleConfirmClick} disabled={!selectedUser}>
              Confirm
            </Button>
          </div>
          {selectedUser && (
            <p className="mt-2 text-sm text-muted-foreground">
              Selected: {selectedUser.name} ({selectedUser.email})
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sellers found.</p>
          ) : (
            <div className="space-y-2">
              {sellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{seller.name}</p>
                    <p className="text-sm text-muted-foreground">{seller.email}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {seller.class && <span>Class: {seller.class}</span>}
                      <span>Max Debt: {seller.maxDebt} KM</span>
                      <span
                        className={cn(
                          parseFloat(seller.balance) < 0
                            ? "text-destructive"
                            : "text-green-600"
                        )}
                      >
                        Balance: {parseFloat(seller.balance).toFixed(2)} KM
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(seller)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(seller)}
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Seller</DialogTitle>
            <DialogDescription>
              Set the maximum debt and class for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
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
                          if (
                            inputValue &&
                            !classes.find((c) => c.name === inputValue)
                          ) {
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
                              "[cmdk-input]"
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
                              setSelectedClass(
                                currentValue === selectedClass ? null : currentValue
                              );
                              setClassPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClass === cls.name
                                  ? "opacity-100"
                                  : "opacity-0"
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
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSeller} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddClassDialog
        open={addClassDialogOpen}
        onOpenChange={setAddClassDialogOpen}
        onClassCreated={handleClassCreated}
        initialName={pendingClassName}
      />

      <SellerEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        seller={editingSeller}
        onUpdated={() => {
          loadSellers();
        }}
        onCreateClass={(name) => {
          setEditDialogOpen(false);
          setPendingClassName(name);
          setAddClassDialogOpen(true);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Seller Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the seller role from{" "}
              {deletingSeller?.name}? This will reset their balance and max debt to
              0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
