"use client";

import * as React from "react";
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

type Passkey = {
  id: string;
  name?: string | null;
  createdAt: Date;
};

export default function AccountPage() {
  usePageTitle("Account Settings");
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
    await authClient.changeEmail({ newEmail: email });
    setIsLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return;
    }
    setIsLoading(true);
    await authClient.changePassword({
      currentPassword,
      newPassword,
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsLoading(false);
  }

  async function handleAddPasskey() {
    await authClient.passkey.addPasskey({ name: passkeyName || undefined });
    setPasskeyName("");
    loadPasskeys();
  }

  async function handleDeletePasskey(id: string) {
    await authClient.passkey.deletePasskey({ id });
    loadPasskeys();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 items-center">
      <div className="grid gap-6 w-full max-w-2xl">
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
      </div>
    </div>
  );
}
