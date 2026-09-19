"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, Trash2, Plus, Eye, Copy } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateCodeAction,
  deleteCodeAction,
  getCodesAction,
  getBalanceAction,
} from "@/lib/actions/seller";

import { GIFT_CARD_VALUES } from "@/lib/billing";

const CODE_TYPE_LABELS: Record<string, string> = {
  balance: "Gift card",
  pro: "Legacy Pro code",
  assign: "Retired class code",
};

const ITEMS_PER_PAGE = 10;

interface Code {
  id: string;
  code: string;
  type: string;
  duration: string;
  value: string;
  sellerId: string;
  redeemedBy: string | null;
  redeemedAt: Date | null;
  wasRedeemedAt: Date | null;
  createdAt: Date;
}

export default function CodesPage() {
  usePageTitle("Codes");
  const [codes, setCodes] = React.useState<Code[]>([]);
  const [balance, setBalance] = React.useState("0");
  const [maxDebt, setMaxDebt] = React.useState("0");
  const [value, setValue] = React.useState<number>(3);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewingCode, setViewingCode] = React.useState<Code | null>(null);

  const price = isAdmin ? 0 : value;
  const currentBalance = parseFloat(balance);
  const maxDebtValue = parseFloat(maxDebt);
  const wouldExceedDebt = currentBalance - price < -maxDebtValue;

  async function loadData() {
    const [codesResult, balanceResult] = await Promise.all([
      getCodesAction(),
      getBalanceAction(),
    ]);
    setCodes(codesResult.codes as Code[]);
    setBalance(balanceResult.balance);
    setMaxDebt(balanceResult.maxDebt);
    setIsAdmin(balanceResult.isAdmin ?? false);
  }

  React.useEffect(() => {
    loadData().catch(() => toast.error("Could not load gift cards. Please reload the page.")).finally(() => setIsInitialLoading(false));
  }, []);

  async function handleGenerateCode() {
    setIsGenerating(true);
    try {
      const result = await generateCodeAction(value);

      if (result.error) {
        toast.error(result.error);
      } else if ("code" in result && result.code) {
        toast.success(`Code generated: ${result.code.code}`);
        await loadData();
      }

    } catch {
      toast.error("Could not generate a gift card. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeleteCode(codeId: string) {
    const result = await deleteCodeAction(codeId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Code deleted and its original cost refunded");
      await loadData();
    }
  }

  async function handleCopyCode(code: Code) {
    await navigator.clipboard.writeText(code.code);
  }

  const unredeemedCodes = codes.filter((c) => !c.wasRedeemedAt);
  const totalPages = Math.ceil(unredeemedCodes.length / ITEMS_PER_PAGE);
  const paginatedCodes = unredeemedCodes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [codes.length]);

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
          <h1 className="text-2xl font-semibold">Codes</h1>
          <p className="text-muted-foreground">
            Balance: {currentBalance.toFixed(2)} KM
          {currentBalance < 0 && (
            <span className="text-destructive ml-2">
              (Debt: {Math.abs(currentBalance).toFixed(2)} KM / Max:{" "}
              {maxDebtValue.toFixed(2)} KM)
            </span>
          )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Generate Code
          </CardTitle>
          <CardDescription>
            Create a gift card that adds its value to a user&apos;s balance. The cost will be deducted from your
            balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label htmlFor="value" className="text-sm font-medium">Gift card value</label>
                <select
                  id="value"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {GIFT_CARD_VALUES.map((d) => (
                    <option key={d} value={d}>
                      {d} KM
                    </option>
                  ))}
                </select>
              </div>

            <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  Cost: {price} KM
                </span>
              <Button
                onClick={handleGenerateCode}
                disabled={isGenerating || wouldExceedDebt}
              >
                {isGenerating ? "Generating..." : "Generate Code"}
              </Button>
            </div>
          </div>

          {wouldExceedDebt && (
            <p className="mt-4 text-sm text-destructive">
              Cannot generate code: would exceed maximum debt of{" "}
              {maxDebtValue.toFixed(2)} KM
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Codes</CardTitle>
          <CardDescription>
            List of all codes you have generated. Unredeemed codes can be
            deleted for a refund.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="size-12 mx-auto mb-4 opacity-50" />
              <p>No codes generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Value</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCodes.map((code) => (
                    <tr key={code.id} className="border-b">
                      <td className="p-3">
                        {CODE_TYPE_LABELS[code.type] || code.type}
                      </td>
                      <td className="p-3">
                        {code.value} KM
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingCode(code)}
                            title="View code"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCode(code.id)}
                            title="Delete code and refund"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={!!viewingCode} onOpenChange={() => setViewingCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Code Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/app/subscription?code=${viewingCode?.code ?? ""}`}
                  size={150}
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-xs text-muted-foreground mb-1">Code</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-lg select-all">{viewingCode?.code}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (viewingCode) {
                      await handleCopyCode(viewingCode);
                      toast.success("Code copied to clipboard");
                    }
                  }}
                  title="Copy code"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p>{viewingCode && CODE_TYPE_LABELS[viewingCode.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Value</p>
                <p>{viewingCode?.value} KM</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p>{viewingCode?.wasRedeemedAt ? "Redeemed" : "Unredeemed"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
