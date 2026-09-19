"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Key, Mail, Fingerprint, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Passkey = {
  id: string;
  name?: string | null;
  createdAt: Date;
};

export function AccountClient({ children }: { children: React.ReactNode }) {
  usePageTitle("Account Settings");
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passkeys, setPasskeys] = React.useState<Passkey[]>([]);
  const [passkeyName, setPasskeyName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function loadPasskeys() {
    const result = await authClient.passkey.listUserPasskeys();
    if (result.data) {
      setPasskeys(result.data as Passkey[]);
    }
  }

  React.useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  React.useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await authClient.changeEmail({ newEmail: email });
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to update email");
      return;
    }

    toast.success("Email updated successfully");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
    });
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed successfully");
  }

  async function handleAddPasskey() {
    const result = await authClient.passkey.addPasskey({ name: passkeyName || undefined });

    if (result.error) {
      toast.error(result.error.message || "Failed to add passkey");
      return;
    }

    setPasskeyName("");
    loadPasskeys();
    toast.success("Passkey added successfully");
  }

  async function handleDeletePasskey(id: string) {
    const result = await authClient.passkey.deletePasskey({ id });

    if (result.error) {
      toast.error(result.error.message || "Failed to delete passkey");
      return;
    }

    loadPasskeys();
    toast.success("Passkey deleted successfully");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 items-center">
      <div className="grid gap-6 w-full max-w-2xl">
        {children}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Email Address
            </CardTitle>
            <CardDescription>
              Change your email address. You may need to verify the new email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Email"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              Password
            </CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="current-password">
                    Current Password
                  </FieldLabel>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm New Password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Changing..." : "Change Password"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="size-5" />
              Passkeys
            </CardTitle>
            <CardDescription>
              Add passkeys for passwordless authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {passkeys.length > 0 ? (
                <div className="space-y-2">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {passkey.name ?? "Unnamed Passkey"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Added{" "}
                          {new Date(passkey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePasskey(passkey.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <FieldDescription>No passkeys registered yet.</FieldDescription>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Passkey name (optional)"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPasskey}
                >
                  Add Passkey
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your account? This will
                    permanently remove your account and all associated data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={async () => {
                      const result = await authClient.deleteUser();
                      if (result.error) {
                        toast.error(result.error.message || "Failed to delete account");
                        return;
                      }
                      toast.success("Account deleted successfully");
                      router.push("/");
                    }}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
