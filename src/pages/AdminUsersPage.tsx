import { useEffect, useMemo, useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, KeyRound, Mail, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/auditLog';

interface UserRow {
  user_id: string;
  email: string;
  banned: boolean;
  last_sign_in: string | null;
  created_at: string;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  pw += Math.floor(Math.random() * 10);
  return pw;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const [pwDialog, setPwDialog] = useState<{ open: boolean; user: UserRow | null }>({
    open: false, user: null,
  });
  const [tempPassword, setTempPassword] = useState('');
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-team', {
      body: { action: 'get_user_statuses' },
    });
    if (error) {
      toast.error(`Failed to load users: ${error.message}`);
    } else if (data?.statuses) {
      setUsers(data.statuses);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email?.toLowerCase().includes(q));
  }, [users, search]);

  async function sendReset(user: UserRow) {
    setActingId(user.user_id);
    const { data, error } = await supabase.functions.invoke('manage-team', {
      body: {
        action: 'send_password_reset',
        email: user.email,
        redirect_to: `${window.location.origin}/reset-password`,
      },
    });
    setActingId(null);
    if (error || data?.error) {
      logAuditEvent({
        action: 'admin.user.password_reset',
        targetType: 'user',
        targetId: user.user_id,
        success: false,
        metadata: { email: user.email, error: error?.message || data?.error },
      });
      toast.error(error?.message || data?.error || 'Failed to send reset');
    } else {
      logAuditEvent({
        action: 'admin.user.password_reset',
        targetType: 'user',
        targetId: user.user_id,
        success: true,
        metadata: { email: user.email, method: 'email_link' },
      });
      toast.success(`Reset email sent to ${user.email}`);
    }
  }

  function openPasswordDialog(user: UserRow) {
    setTempPassword(generateTempPassword());
    setGeneratedResult(null);
    setCopied(false);
    setPwDialog({ open: true, user });
  }

  async function applyTempPassword() {
    if (!pwDialog.user) return;
    if (tempPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setActingId(pwDialog.user.user_id);
    const { data, error } = await supabase.functions.invoke('manage-team', {
      body: {
        action: 'update_auth_user',
        user_id: pwDialog.user.user_id,
        password: tempPassword,
      },
    });
    setActingId(null);
    if (error || data?.error) {
      logAuditEvent({
        action: 'admin.user.temp_password_set',
        targetType: 'user',
        targetId: pwDialog.user.user_id,
        success: false,
        metadata: { email: pwDialog.user.email, error: error?.message || data?.error },
      });
      toast.error(error?.message || data?.error || 'Failed to set password');
      return;
    }
    logAuditEvent({
      action: 'admin.user.temp_password_set',
      targetType: 'user',
      targetId: pwDialog.user.user_id,
      success: true,
      metadata: { email: pwDialog.user.email },
    });
    setGeneratedResult(tempPassword);
    toast.success('Temporary password set');
  }

  function copyPw() {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Reset passwords or set a temporary password instantly when email delivery fails.
            </p>
          </div>
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All accounts</CardTitle>
            <CardDescription>
              {users.length} user{users.length === 1 ? '' : 's'} found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last sign in</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.banned ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.last_sign_in
                            ? new Date(u.last_sign_in).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReset(u)}
                            disabled={actingId === u.user_id}
                          >
                            {actingId === u.user_id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Send reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openPasswordDialog(u)}
                            disabled={actingId === u.user_id}
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                            Set temp password
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No users match your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={pwDialog.open}
        onOpenChange={(open) => setPwDialog({ open, user: open ? pwDialog.user : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set temporary password</DialogTitle>
            <DialogDescription>
              For <span className="font-medium text-foreground">{pwDialog.user?.email}</span>.
              They can sign in with this password and change it after.
            </DialogDescription>
          </DialogHeader>

          {!generatedResult ? (
            <div className="space-y-4">
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Share this password through a secure channel (in person, encrypted message). The
                  user will not be notified automatically.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setTempPassword(generateTempPassword())}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Auto-generated passwords meet platform requirements.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>Password updated successfully.</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Share this password with the user</Label>
                <div className="flex gap-2">
                  <Input value={generatedResult} readOnly className="font-mono" />
                  <Button variant="outline" type="button" onClick={copyPw}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPwDialog({ open: false, user: null })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={applyTempPassword}
                  disabled={actingId === pwDialog.user?.user_id}
                >
                  {actingId === pwDialog.user?.user_id && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Set password
                </Button>
              </>
            ) : (
              <Button onClick={() => setPwDialog({ open: false, user: null })}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
