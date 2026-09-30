import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, DollarSign, PackageX, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared";
import { pageHead } from "@/lib/format";
import { useDB, actions } from "@/lib/store";
import type { Settings } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/settings/notifications")({
  head: pageHead("Settings: notifications", "Choose which alerts you receive and how."),
  component: NotificationsSettingsPage,
});

const EVENTS: { key: keyof Settings["notifications"]; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "lowStock", label: "Low Stock Alert", hint: "Notify when product stock reaches minimum level.", icon: PackageX },
  { key: "dailySummary", label: "Daily Sales Summary", hint: "Receive a summary of the day's sales every evening.", icon: Bell },
  { key: "paymentReminder", label: "Customer Payment Reminder", hint: "Remind customers with outstanding dues.", icon: Users },
  { key: "purchaseReminder", label: "Supplier Payment Reminder", hint: "Remind you of pending supplier payments.", icon: DollarSign },
];

const CHANNELS: { key: keyof Settings["notifications"]; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
];

function NotificationsSettingsPage() {
  const db = useDB();
  const [notif, setNotif] = useState(db.settings.notifications);

  const save = () => {
    actions.updateSettings("notifications", notif);
    toast.success("Notification preferences saved.");
  };

  return (
    <div>
      <PageHeader title="Settings: notifications" description="Control alerts and delivery channels." />
      <div className="grid gap-4">
        <Card className="shadow-none lg:col-span-2">
          <CardContent className="divide-y p-0">
            {EVENTS.map((e) => (
              <div key={e.key} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><e.icon className="size-4.5" /></div>
                  <div>
                    <p className="text-sm font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.hint}</p>
                  </div>
                </div>
                <Switch checked={notif[e.key]} onCheckedChange={(v) => setNotif({ ...notif, [e.key]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save}>Save Changes</Button>
      </div>
    </div>
  );
}
