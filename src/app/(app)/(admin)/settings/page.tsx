import { getAppSettings } from "@/lib/app-settings";
import { isDemoMode } from "@/lib/demo/is-demo-mode";
import { SettingsForm } from "./settings-form";
import { ResetDemoSection } from "./reset-demo-section";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Application-wide configuration. Changes are logged and take effect immediately.
        </p>
      </div>
      {/*
        Keyed on updated_at so a save (which revalidates this page) fully
        remounts the form instead of leaving its uncontrolled
        defaultChecked/defaultValue fields stale — otherwise they'd keep
        showing what was typed rather than the confirmed, possibly
        server-normalized, saved value.
      */}
      <SettingsForm key={settings.updated_at} settings={settings} />
      {isDemoMode() && <ResetDemoSection />}
    </div>
  );
}
