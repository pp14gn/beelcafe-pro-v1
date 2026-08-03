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
import { Loader2, RefreshCw, Store, Copy, CheckCircle2, XCircle } from "lucide-react";

type Config = {
  id: string;
  store_id: string | null;
  store_name: string | null;
  is_enabled: boolean;
  auto_accept_orders: boolean;
  store_status: string;
  last_menu_sync_at: string | null;
  last_menu_sync_status: string | null;
};

type LogRow = {
  id: string;
  action: string;
  success: boolean;
  message: string | null;
  created_at: string;
};

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uber-eats-webhook`;

export function UberEatsSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

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
        <Button disabled={busy === "Menu sync"} onClick={() => call("uber-eats-sync-menu", {}, "Menu sync")}>
          {busy === "Menu sync" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync menu now
        </Button>
      </Card>

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