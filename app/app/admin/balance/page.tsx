"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import {
  searchSellersAction,
  adjustBalanceAction,
  getSellerBalanceAction,
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
import { ChevronsUpDown, Check, Wallet } from "lucide-react";
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

export default function AdminBalancePage() {
  usePageTitle("Balance Management");
  const [sellerSearch, setSellerSearch] = React.useState("");
  const [searchedSellers, setSearchedSellers] = React.useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = React.useState<Seller | null>(null);
  const [sellerPopoverOpen, setSellerPopoverOpen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  const [amount, setAmount] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const sellerListId = React.useId();

  React.useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  React.useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (sellerSearch.length >= 1) {
        setIsSearching(true);
        const result = await searchSellersAction(sellerSearch);
        if ("sellers" in result) {
          setSearchedSellers(result.sellers ?? []);
        }
        setIsSearching(false);
      } else {
        setSearchedSellers([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [sellerSearch]);

  const handleSellerSelect = async (seller: Seller) => {
    const balanceResult = await getSellerBalanceAction(seller.id);
    if ("balance" in balanceResult) {
      setSelectedSeller({
        ...seller,
        balance: balanceResult.balance ?? "0",
        maxDebt: balanceResult.maxDebt ?? "0",
      });
    } else {
      setSelectedSeller(seller);
    }
    setSellerSearch("");
    setSearchedSellers([]);
    setSellerPopoverOpen(false);
    setAmount("");
  };

  const handleBalanceAction = async (type: "add" | "remove" | "set") => {
    if (!selectedSeller || !amount) return;

    setIsLoading(true);

    const result = await adjustBalanceAction(selectedSeller.id, type, amount);

    if ("error" in result && result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    if ("newBalance" in result) {
      setSelectedSeller({
        ...selectedSeller,
        balance: result.newBalance ?? "0",
      });
      toast.success(
        `Balance ${type === "add" ? "increased" : type === "remove" ? "decreased" : "set"} successfully`
      );
    }

    setIsLoading(false);
    setAmount("");
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
          <h1 className="text-2xl font-bold">Balance Management</h1>
          <p className="text-muted-foreground">
            Adjust seller balances
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Adjust Seller Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search Seller</Label>
            <Popover open={sellerPopoverOpen} onOpenChange={setSellerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sellerPopoverOpen}
                  aria-controls={sellerListId}
                  className="w-full justify-between"
                >
                  {selectedSeller
                    ? `${selectedSeller.name} (${selectedSeller.email})`
                    : "Search sellers..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command id={sellerListId}>
                  <CommandInput
                    placeholder="Type to search..."
                    value={sellerSearch}
                    onValueChange={setSellerSearch}
                  />
                  <CommandList>
                    {isSearching ? (
                      <div className="py-6 text-center text-sm">Searching...</div>
                    ) : (
                      <>
                        <CommandEmpty>No sellers found.</CommandEmpty>
                        <CommandGroup>
                          {searchedSellers.map((seller) => (
                            <CommandItem
                              key={seller.id}
                              value={`${seller.name} ${seller.email}`}
                              onSelect={() => handleSellerSelect(seller)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSeller?.id === seller.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div>
                                <div>{seller.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {seller.email} - Balance:{" "}
                                  {parseFloat(seller.balance).toFixed(2)} KM
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

          {selectedSeller && (
            <>
              <div className="rounded-lg border p-4">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedSeller.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedSeller.email}</span>
                  </div>
                  {selectedSeller.class && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{selectedSeller.class}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Debt:</span>
                    <span>{selectedSeller.maxDebt} KM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Balance:</span>
                    <span
                      className={cn(
                        "font-bold",
                        parseFloat(selectedSeller.balance) < 0
                          ? "text-destructive"
                          : "text-green-600"
                      )}
                    >
                      {parseFloat(selectedSeller.balance).toFixed(2)} KM
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KM)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleBalanceAction("add")}
                  disabled={isLoading || !amount}
                  variant="default"
                >
                  Add to Balance
                </Button>
                <Button
                  onClick={() => handleBalanceAction("remove")}
                  disabled={isLoading || !amount}
                  variant="secondary"
                >
                  Remove from Balance
                </Button>
                <Button
                  onClick={() => handleBalanceAction("set")}
                  disabled={isLoading || !amount}
                  variant="outline"
                >
                  Set Balance
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
