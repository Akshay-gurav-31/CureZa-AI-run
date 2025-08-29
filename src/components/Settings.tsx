import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { config } from "@/lib/config";
import ConfigValidator from "./ConfigValidator";
import {
  Settings as SettingsIcon,
  User,
  Database,
  Shield,
  Bell,
  Palette,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Key,
  Cloud,
  Moon,
  Sun,
  Monitor,
  Globe,
  Save,
  AlertTriangle,
  Bug
} from "lucide-react";

interface UserSettings {
  profile: {
    name: string;
    email: string;
    institution: string;
    researchField: string;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    dateFormat: string;
    autoSave: boolean;
    notifications: {
      email: boolean;
      push: boolean;
      research: boolean;
      hypotheses: boolean;
    };
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
    publicProfile: boolean;
  };
  storage: {
    driveConnected: boolean;
    storageUsed: number;
    storageLimit: number;
  };
}

const Settings = () => {
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      name: "",
      email: "",
      institution: "",
      researchField: ""
    },
    preferences: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      autoSave: true,
      notifications: {
        email: true,
        push: false,
        research: true,
        hypotheses: true
      }
    },
    privacy: {
      shareData: false,
      analytics: true,
      publicProfile: false
    },
    storage: {
      driveConnected: !!config.googleDrive.clientId,
      storageUsed: 0,
      storageLimit: 15000 // 15GB in MB
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor }
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "zh", label: "中文" }
  ];

  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time" },
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "Europe/London", label: "London" },
    { value: "Asia/Tokyo", label: "Tokyo" }
  ];

  const updateSettings = (section: keyof UserSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setHasChanges(false);
    setSaving(false);
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'eliza-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const resetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      // Reset to default settings
      setSettings({
        profile: { name: "", email: "", institution: "", researchField: "" },
        preferences: {
          theme: "system",
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          autoSave: true,
          notifications: { email: true, push: false, research: true, hypotheses: true }
        },
        privacy: { shareData: false, analytics: true, publicProfile: false },
        storage: { driveConnected: false, storageUsed: 0, storageLimit: 15000 }
      });
      setHasChanges(true);
    }
  };

  const storagePercentage = Math.round((settings.storage.storageUsed / settings.storage.storageLimit) * 100);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <SettingsIcon className="w-6 h-6" />
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account, preferences, and application settings
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportSettings}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={resetSettings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                You have unsaved changes. Don't forget to save your settings.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and research details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Full Name</label>
                      <Input
                        value={settings.profile.name}
                        onChange={(e) => updateSettings('profile', { name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email Address</label>
                      <Input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateSettings('profile', { email: e.target.value })}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Institution</label>
                      <Input
                        value={settings.profile.institution}
                        onChange={(e) => updateSettings('profile', { institution: e.target.value })}
                        placeholder="University or organization"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Research Field</label>
                      <Input
                        value={settings.profile.researchField}
                        onChange={(e) => updateSettings('profile', { researchField: e.target.value })}
                        placeholder="e.g., Computer Science, Biology"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Appearance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-3 block">Theme</label>
                      <div className="grid grid-cols-3 gap-3">
                        {themes.map(theme => (
                          <div
                            key={theme.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              settings.preferences.theme === theme.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/50'
                            }`}
                            onClick={() => updateSettings('preferences', { theme: theme.value })}
                          >
                            <div className="flex items-center gap-2">
                              <theme.icon className="w-4 h-4" />
                              <span className="font-medium">{theme.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Language</label>
                        <Select
                          value={settings.preferences.language}
                          onValueChange={(value) => updateSettings('preferences', { language: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map(lang => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Timezone</label>
                        <Select
                          value={settings.preferences.timezone}
                          onValueChange={(value) => updateSettings('preferences', { timezone: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.map(tz => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Auto-save</div>
                        <div className="text-sm text-muted-foreground">
                          Automatically save your work
                        </div>
                      </div>
                      <Switch
                        checked={settings.preferences.autoSave}
                        onCheckedChange={(checked) => updateSettings('preferences', { autoSave: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(settings.preferences.notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          <div className="text-sm text-muted-foreground">
                            {key === 'email' && 'Receive notifications via email'}
                            {key === 'push' && 'Receive push notifications in browser'}
                            {key === 'research' && 'Notifications about new research papers'}
                            {key === 'hypotheses' && 'Notifications about hypothesis updates'}
                          </div>
                        </div>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => 
                            updateSettings('preferences', {
                              notifications: { ...settings.preferences.notifications, [key]: checked }
                            })
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control how your data is used and shared
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.privacy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">
                          {key === 'shareData' && 'Share Data for Research'}
                          {key === 'analytics' && 'Usage Analytics'}
                          {key === 'publicProfile' && 'Public Profile'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {key === 'shareData' && 'Allow anonymized data to be used for research improvements'}
                          {key === 'analytics' && 'Help improve the application by sharing usage statistics'}
                          {key === 'publicProfile' && 'Make your research profile visible to other users'}
                        </div>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => updateSettings('privacy', { [key]: checked })}
                      />
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Data Management</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3 mr-2" />
                        Download My Data
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storage">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Storage Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Storage Used</span>
                        <span>{settings.storage.storageUsed} MB of {settings.storage.storageLimit} MB</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            storagePercentage > 90 ? 'bg-red-500' :
                            storagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${storagePercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {storagePercentage}% used
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="w-5 h-5" />
                      Google Drive Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Status: {settings.storage.driveConnected ? 'Connected' : 'Not Connected'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {settings.storage.driveConnected 
                            ? 'Your Google Drive is connected and syncing'
                            : 'Connect Google Drive to access your research papers'
                          }
                        </div>
                      </div>
                      <Button variant={settings.storage.driveConnected ? "outline" : "default"}>
                        {settings.storage.driveConnected ? 'Disconnect' : 'Connect Drive'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Advanced configuration options for power users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">API Keys</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">OpenAI API Key</label>
                        <Input 
                          type="password" 
                          value={config.openaiApiKey || ''}
                          placeholder="sk-..."
                          readOnly
                          className="bg-muted"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {config.openaiApiKey ? '✅ Configured' : '❌ Not configured'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Drive Client ID</label>
                        <Input 
                          value={config.googleDrive.clientId || ''}
                          placeholder="Google Client ID"
                          readOnly
                          className="bg-muted"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {config.googleDrive.clientId ? '✅ Configured' : '❌ Not configured'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Supabase URL</label>
                        <Input 
                          value={config.postgresUrl ? new URL(config.postgresUrl).origin : ''}
                          placeholder="https://your-project.supabase.co"
                          readOnly
                          className="bg-muted"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {config.postgresUrl ? '✅ Configured' : '❌ Not configured'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Developer Options</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Debug Mode</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Beta Features</span>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Danger Zone</h4>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-3 h-3 mr-2" />
                      Reset All Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="debug">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bug className="w-5 h-5 text-orange-500" />
                      System Diagnostics
                    </CardTitle>
                    <CardDescription>
                      Troubleshoot PDF processing issues and validate system configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Bug className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800">PDF Processing Issues?</h4>
                            <p className="text-sm text-orange-700 mt-1">
                              If you're experiencing "0 PDFs processed" errors, use the tools below to diagnose the issue. Common causes include:
                            </p>
                            <ul className="text-sm text-orange-700 mt-2 list-disc list-inside space-y-1">
                              <li>Missing or invalid API keys</li>
                              <li>Network connectivity issues</li>
                              <li>PDFs with scanned images (not selectable text)</li>
                              <li>Password-protected PDF files</li>
                              <li>Supabase function deployment issues</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <ConfigValidator />
                      
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>🔍 How to use these tools:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>First run "Test System Configuration" to verify all APIs are working</li>
                          <li>If configuration tests pass, connect Google Drive and try processing a PDF</li>
                          <li>If PDFs fail, click "Debug PDF Issues" on the Google Drive connection page</li>
                          <li>Check the detailed logs to identify the specific failure point</li>
                        </ol>
                        
                        <p className="mt-4"><strong>💡 Quick fixes:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Ensure your .env file contains all required VITE_ prefixed variables</li>
                          <li>Verify your OpenAI API key is valid and has sufficient credits</li>
                          <li>Check that Google Drive API is enabled in Google Cloud Console</li>
                          <li>Try with a different PDF file (preferably with selectable text)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;