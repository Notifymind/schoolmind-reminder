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
import { Ticket, Trash2, Plus, AlertCircle, Eye, Copy, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  generateCodeAction,
  deleteCodeAction,
  getCodesAction,
  getBalanceAction,
  type CodeType,
  type CodeDuration,
} from "@/lib/actions/seller";

const PRICING = {
  basic: { month: 2, school_year: 16 },
  pro: { month: 4, school_year: 24 },
  upgrade: { month: 2, school_year: 8 },
} as const;

const CODE_TYPE_LABELS: Record<CodeType, string> = {
  basic: "Basic Code",
  pro: "Pro Code",
  upgrade: "Upgrade Code (Basic to Pro)",
};

const DURATION_LABELS: Record<CodeDuration, string> = {
  month: "Month",
  school_year: "School Year",
};

const ITEMS_PER_PAGE = 10;

interface Code {
  id: number;
  code: string;
  type: string;
  duration: string;
  value: string;
  sellerId: string;
  redeemedBy: string | null;
  redeemedAt: Date | null;
  createdAt: Date;
}

export default function CodesPage() {
  usePageTitle("Codes");
  const [codes, setCodes] = React.useState<Code[]>([]);
  const [balance, setBalance] = React.useState("0");
  const [maxDebt, setMaxDebt] = React.useState("0");
  const [codeType, setCodeType] = React.useState<CodeType>("basic");
  const [duration, setDuration] = React.useState<CodeDuration>("month");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewingCode, setViewingCode] = React.useState<Code | null>(null);
  const [copiedId, setCopiedId] = React.useState<number | null>(null);

  const price = PRICING[codeType][duration];
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
  }

  React.useEffect(() => {
    loadData().finally(() => setIsInitialLoading(false));
  }, []);

  async function handleGenerateCode() {
    setError(null);
    setSuccess(null);
    setIsGenerating(true);

    const result = await generateCodeAction(codeType, duration);

    if (result.error) {
      setError(result.error);
    } else if (result.code) {
      setSuccess(`Code generated: ${result.code.code}`);
      await loadData();
    }

    setIsGenerating(false);
  }

  async function handleDeleteCode(codeId: number) {
    setError(null);
    setSuccess(null);

    const result = await deleteCodeAction(codeId);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Code deleted and value refunded to your balance");
      await loadData();
    }
  }

  async function handleCopyCode(code: Code) {
    await navigator.clipboard.writeText(code.code);
    setCopiedId(code.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const unredeemedCodes = codes.filter((c) => !c.redeemedBy);
  const redeemedCodes = codes.filter((c) => c.redeemedBy);
  const allCodesSorted = [...unredeemedCodes, ...redeemedCodes];
  const totalPages = Math.ceil(allCodesSorted.length / ITEMS_PER_PAGE);
  const paginatedCodes = allCodesSorted.slice(
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

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="size-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          <Ticket className="size-5" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Generate Code
          </CardTitle>
          <CardDescription>
            Create a new subscription code. The cost will be deducted from your
            balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Code Type</label>
              <select
                value={codeType}
                onChange={(e) => setCodeType(e.target.value as CodeType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.entries(CODE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as CodeDuration)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.entries(DURATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} ({PRICING[codeType][value as CodeDuration]} KM)
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
                    <th className="text-left p-3 font-medium">Duration</th>
                    <th className="text-right p-3 font-medium">Value</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCodes.map((code) => (
                    <tr key={code.id} className={code.redeemedBy ? "border-b opacity-60" : "border-b"}>
                      <td className="p-3">
                        {CODE_TYPE_LABELS[code.type as CodeType] || code.type}
                      </td>
                      <td className="p-3">
                        {DURATION_LABELS[code.duration as CodeDuration] ||
                          code.duration}
                      </td>
                      <td className="p-3 text-right">{code.value} KM</td>
                      <td className="p-3">
                        {code.redeemedBy ? (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                            Redeemed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                            Unredeemed
                          </span>
                        )}
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
                            onClick={() => handleCopyCode(code)}
                            title="Copy code"
                          >
                            {copiedId === code.id ? (
                              <Check className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                          {!code.redeemedBy && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCode(code.id)}
                              title="Delete code and refund"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
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

      <AlertDialog open={!!viewingCode} onOpenChange={() => setViewingCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Code Details</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <div className="rounded-md bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">Code</p>
                <p className="font-mono text-lg select-all">{viewingCode?.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>{viewingCode && CODE_TYPE_LABELS[viewingCode.type as CodeType]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p>{viewingCode && DURATION_LABELS[viewingCode.duration as CodeDuration]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Value</p>
                  <p>{viewingCode?.value} KM</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{viewingCode?.redeemedBy ? "Redeemed" : "Unredeemed"}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={async () => {
                if (viewingCode) {
                  await handleCopyCode(viewingCode);
                  setViewingCode(null);
                }
              }}
            >
              <Copy className="size-4 mr-2" />
              Copy Code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
