import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Store, Copy, CheckCircle2, XCircle, FlaskConical, ShieldCheck, KeyRound, Stethoscope } from "lucide-react";

type Config = {
  id: string;
  store_id: string | null;
  store_name: string | null;
  is_enabled: boolean;
  auto_accept_orders: boolean;
  store_status: string;
  last_menu_sync_at: string | null;
  last_menu_sync_status: string | null;
  authorized_at: string | null;
  authorized_scopes: string | null;
  auth_environment: string | null;
};

type LogRow = {
  id: string;
  action: string;
  success: boolean;
  message: string | null;
  created_at: string;
};

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uber-eats-webhook`;

const UBER_TOKEN_URL = {
  sandbox: "https://sandbox-login.uber.com/oauth/v2/token",
  production: "https://login.uber.com/oauth/v2/token",
};

const AVAILABLE_SCOPES = [
  { id: "eats.store", label: "Read store details" },
  { id: "eats.store.status.write", label: "Change store status (online / paused)" },
  { id: "eats.store.orders.read", label: "Read store orders" },
  { id: "eats.order", label: "Accept, deny and update orders" },
  { id: "eats.pos_provisioning", label: "POS provisioning / menu sync" },
];
const DEFAULT_SCOPES = "eats.store eats.store.status.write eats.store.orders.read eats.order";

export function UberEatsSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [tokenTest, setTokenTest] = useState<any | null>(null);
  const [authEnv, setAuthEnv] = useState<"sandbox" | "production">(
    () => (localStorage.getItem("ue_auth_env") as "sandbox" | "production") || "production",
  );
  const [authScopes, setAuthScopes] = useState(() => localStorage.getItem("ue_auth_scopes") ?? DEFAULT_SCOPES);
  const { toast } = useToast();

  const selectedScopes = authScopes.split(/\s+/).filter(Boolean);
  const toggleScope = (id: string, on: boolean) => {
    const next = on ? [...selectedScopes, id] : selectedScopes.filter((s) => s !== id);
    const value = Array.from(new Set(next)).join(" ");
    setAuthScopes(value);
    localStorage.setItem("ue_auth_scopes", value);
  };

  const generateToken = async () => {
    if (selectedScopes.length === 0) {
      toast({ title: "Select at least one scope", description: "Step 1: choose the permissions your app needs.", variant: "destructive" });
      return;
    }
    localStorage.setItem("ue_auth_env", authEnv);
    localStorage.setItem("ue_auth_scopes", authScopes);
    setBusy("Generate token");
    try {
      const { data, error } = await supabase.functions.invoke("uber-eats-generate-token", {
        body: { environment: authEnv, scope: authScopes },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Access token generated", description: `Environment: ${data.environment}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Token request failed", description: e.message });
    } finally {
      setBusy(null);
      load();
    }
  };

  const testToken = async () => {
    setBusy("Test token");
    try {
      const { data, error } = await supabase.functions.invoke("uber-eats-test-token", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTokenTest(data);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Token test failed", description: e.message });
    } finally {
      setBusy(null);
    }
  };

  const load = async () => {
    const [{ data: cfg }, { data: logRows }] = await Promise.all([
      supabase.from("uber_eats_config").select("*").limit(1).maybeSingle(),
      supabase.from("uber_eats_sync_log").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setConfig(cfg as Config | null);
    setLogs((logRows ?? []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (p: Partial<Config>) => setConfig((c) => (c ? { ...c, ...p } : c));

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("uber_eats_config")
      .update({
        store_id: config.store_id,
        store_name: config.store_name,
        is_enabled: config.is_enabled,
        auto_accept_orders: config.auto_accept_orders,
      })
      .eq("id", config.id);
    setSaving(false);
    toast(error
      ? { variant: "destructive", title: "Could not save", description: error.message }
      : { title: "Uber Eats settings saved" });
  };

  const call = async (fn: string, body: any, label: string) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: data?.message ?? `${label} complete` });
    } catch (e: any) {
      toast({ variant: "destructive", title: `${label} failed`, description: e.message });
    } finally {
      setBusy(null);
      load();
    }
  };

  const setStatus = (status: string) =>
    call("uber-eats-store", { action: "set_status", status }, `Set store ${status}`);

  const testSync = async () => {
    setBusy("Test sync");
    try {
      const { data, error } = await supabase.functions.invoke("uber-eats-sync-menu", {
        body: { dry_run: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPreview(data.preview);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Test sync failed", description: e.message });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!config) return <div className="p-6 text-sm text-muted-foreground">Uber Eats config not available.</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Uber Eats integration</h3>
          </div>
          <Badge variant={config.is_enabled ? "default" : "outline"}>
            {config.is_enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ue-store-id">Uber Eats Store ID</Label>
            <Input
              id="ue-store-id"
              value={config.store_id ?? ""}
              placeholder="e.g. 3f2b9c8a-1234-…"
              onChange={(e) => patch({ store_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ue-store-name">Store name on Uber Eats</Label>
            <Input
              id="ue-store-name"
              value={config.store_name ?? ""}
              onChange={(e) => patch({ store_name: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable integration</Label>
            <p className="text-xs text-muted-foreground">Turn on menu sync and order intake.</p>
          </div>
          <Switch checked={config.is_enabled} onCheckedChange={(v) => patch({ is_enabled: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-accept orders</Label>
            <p className="text-xs text-muted-foreground">Confirm incoming Uber Eats orders automatically.</p>
          </div>
          <Switch checked={config.auto_accept_orders} onCheckedChange={(v) => patch({ auto_accept_orders: v })} />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save settings
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">App authorization (client credentials)</h3>
          <Badge variant={config.authorized_at ? "default" : "outline"}>
            {config.authorized_at ? `Authorized (${config.auth_environment ?? "sandbox"})` : "Not authorized"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Step 1: pick the scopes below. Step 2: generate the access token — the server posts your Client ID and Secret to
          Uber's token endpoint with <span className="font-mono text-xs">grant_type=client_credentials</span>. Step 3: every
          Uber Eats API call from this app then sends that token as a Bearer header, and it is renewed automatically when it
          expires.
          {config.authorized_at && (
            <> Last generated {new Date(config.authorized_at).toLocaleString()}.</>
          )}
        </p>

        <div className="space-y-2">
          <Label>Scopes</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {AVAILABLE_SCOPES.map((s) => (
              <label key={s.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <Checkbox
                  checked={selectedScopes.includes(s.id)}
                  onCheckedChange={(v) => toggleScope(s.id, v === true)}
                />
                <span>
                  <span className="font-mono text-xs">{s.id}</span>
                  <span className="block text-xs text-muted-foreground">{s.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Environment</Label>
            <p className="text-xs text-muted-foreground">
              {UBER_TOKEN_URL[authEnv]} — if you get an environment mismatch error, switch this toggle: your app credentials
              must belong to the same environment.
            </p>
          </div>
          <Switch checked={authEnv === "production"} onCheckedChange={(v) => setAuthEnv(v ? "production" : "sandbox")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generateToken} disabled={!!busy}>
            {busy === "Generate token"
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <KeyRound className="h-4 w-4 mr-2" />}
            Generate access token
          </Button>
          <Button variant="outline" onClick={testToken} disabled={!!busy}>
            {busy === "Test token"
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Stethoscope className="h-4 w-4 mr-2" />}
            Test access token
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The test calls the Uber Eats sandbox API (<span className="font-mono">sandbox-api.uber.com</span>) with the stored
          token as a Bearer header, following Uber's sandbox guide, and reports each endpoint's response.
        </p>
        <p className="text-xs text-muted-foreground break-all">
          Scopes: {selectedScopes.join(" ") || "none selected"}
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Store availability</h3>
        <p className="text-sm text-muted-foreground">
          Current status: <span className="font-medium">{config.store_status}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!!busy} onClick={() => setStatus("ONLINE")}>Go online</Button>
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => setStatus("PAUSED")}>Pause orders</Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setStatus("OFFLINE")}>Go offline</Button>
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => call("uber-eats-store", { action: "get" }, "Fetch store")}>
            Check store
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Menu synchronization</h3>
        <p className="text-sm text-muted-foreground">
          Pushes your active recipes, sizes and extras to Uber Eats.
          {config.last_menu_sync_at && (
            <> Last sync: {new Date(config.last_menu_sync_at).toLocaleString()} ({config.last_menu_sync_status}).</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!!busy} onClick={() => call("uber-eats-sync-menu", {}, "Menu sync")}>
            {busy === "Menu sync" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync menu now
          </Button>
          <Button variant="outline" disabled={!!busy} onClick={testSync}>
            {busy === "Test sync" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Test sync (dry run)
          </Button>
        </div>
      </Card>

      <Dialog open={!!tokenTest} onOpenChange={(o) => !o && setTokenTest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Access token test</DialogTitle>
            <DialogDescription>{tokenTest?.summary}</DialogDescription>
          </DialogHeader>
          {tokenTest && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={tokenTest.auth_ok ? "default" : "destructive"}>
                  {tokenTest.auth_ok ? "Token accepted" : "Token rejected"}
                </Badge>
                <Badge variant="secondary">{tokenTest.environment}</Badge>
                <Badge variant={tokenTest.expired ? "destructive" : "outline"}>
                  {tokenTest.expired ? "Expired" : "Valid"}
                  {tokenTest.expires_at && ` · ${new Date(tokenTest.expires_at).toLocaleString()}`}
                </Badge>
                {!tokenTest.store_id && <Badge variant="outline">No store ID set</Badge>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>API base: <span className="font-mono">{tokenTest.api_base}</span></div>
                <div>Token: <span className="font-mono">{tokenTest.token_preview}</span> ({tokenTest.token_type})</div>
                <div>Scopes: <span className="font-mono">{tokenTest.scope ?? "unknown"}</span></div>
              </div>
              <ScrollArea className="h-[300px] rounded-md border p-3">
                <div className="space-y-2">
                  {tokenTest.checks?.map((c: any, i: number) => (
                    <div key={i} className="rounded-md border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">{c.path}</span>
                        <span className={c.ok ? "text-green-600" : "text-destructive"}>
                          HTTP {c.status} · {c.ms}ms
                        </span>
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">
                        {JSON.stringify(c.body, null, 2)?.slice(0, 800)}
                      </pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dry run preview</DialogTitle>
            <DialogDescription>
              Nothing was sent to Uber Eats. This is exactly what a real sync would push.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{preview.totals.recipes} recipes</Badge>
                <Badge variant="secondary">{preview.totals.categories} categories</Badge>
                <Badge variant="secondary">{preview.totals.items} items</Badge>
                <Badge variant="secondary">{preview.totals.modifier_groups} modifier groups</Badge>
                {!preview.store_id && <Badge variant="destructive">No store ID set</Badge>}
              </div>
              <ScrollArea className="h-[420px] rounded-md border p-3">
                <div className="space-y-3">
                  {preview.recipes.map((r: any) => (
                    <div key={r.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">${Number(r.price).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.category}</div>
                      {r.sizes.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium">Sizes</div>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {r.sizes.map((s: any, i: number) => (
                              <li key={i}>
                                {s.name}{s.is_default ? " (default)" : ""} — +${Number(s.price_adjustment).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.modifiers.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium">Extras</div>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {r.modifiers.map((m: any, i: number) => (
                              <li key={i}>{m.name} — ${Number(m.price).toFixed(2)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.sizes.length === 0 && r.modifiers.length === 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">No sizes or extras</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">Webhook URL</h3>
        <p className="text-sm text-muted-foreground">
          Paste this into the Uber Eats developer dashboard for order notification events.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast({ title: "Copied" }); }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">Recent activity</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Uber Eats activity yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l, i) => (
              <div key={l.id}>
                {i > 0 && <Separator className="mb-2" />}
                <div className="flex items-start gap-2 text-sm">
                  {l.success
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium capitalize">{l.action.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{l.message}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}