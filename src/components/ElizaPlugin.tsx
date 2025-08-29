import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config as appConfig } from "@/lib/config";
import { 
  Brain, 
  Settings, 
  Zap, 
  Play, 
  Pause,
  Save,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Code,
  Database,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";

interface ElizaConfig {
  name: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
  enabled: boolean;
}

interface AgentStatus {
  isRunning: boolean;
  uptime: string;
  totalInteractions: number;
  successRate: number;
  lastActivity: string;
}

const ElizaPlugin = () => {
  const [config, setConfig] = useState<ElizaConfig>({
    name: "Research Assistant",
    description: "AI agent specialized in research paper analysis and hypothesis generation",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: "You are a research assistant specialized in analyzing academic papers and generating hypotheses.",
    tools: ["paper_analysis", "hypothesis_generation", "knowledge_extraction"],
    enabled: true
  });

  const [status, setStatus] = useState<AgentStatus>({
    isRunning: false,
    uptime: "0h 0m",
    totalInteractions: 0,
    successRate: 95,
    lastActivity: "Never"
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);

  // Check API key validity on component mount
  useEffect(() => {
    const checkApiKey = () => {
      const hasKey = !!appConfig.openaiApiKey && appConfig.openaiApiKey.startsWith('sk-');
      setApiKeyValid(hasKey);
      if (!hasKey) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Warning: OpenAI API key not configured or invalid`]);
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] OpenAI API key configured successfully`]);
      }
    };
    
    checkApiKey();
  }, []);

  const availableModels = [
    { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast and efficient" },
    { id: "claude-3", name: "Claude 3", description: "Great for analysis" }
  ];

  const availableTools = [
    { id: "paper_analysis", name: "Paper Analysis", description: "Analyze research papers" },
    { id: "hypothesis_generation", name: "Hypothesis Generation", description: "Generate research hypotheses" },
    { id: "knowledge_extraction", name: "Knowledge Extraction", description: "Extract key insights" },
    { id: "citation_analysis", name: "Citation Analysis", description: "Analyze paper citations" },
    { id: "trend_detection", name: "Trend Detection", description: "Detect research trends" }
  ];

  useEffect(() => {
    // Simulate status updates
    const interval = setInterval(() => {
      if (status.isRunning) {
        setStatus(prev => ({
          ...prev,
          totalInteractions: prev.totalInteractions + Math.floor(Math.random() * 3),
          lastActivity: new Date().toLocaleTimeString()
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status.isRunning]);

  const handleStartAgent = async () => {
    if (!apiKeyValid) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: Cannot start agent - OpenAI API key not configured`]);
      return;
    }

    setLoading(true);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting agent with OpenAI API...`]);
    
    // Simulate agent startup with API validation
    setTimeout(() => {
      setStatus(prev => ({ ...prev, isRunning: true }));
      setLogs(prev => [...prev, 
        `[${new Date().toLocaleTimeString()}] Agent started successfully`,
        `[${new Date().toLocaleTimeString()}] Using model: ${config.model}`,
        `[${new Date().toLocaleTimeString()}] API endpoint: https://api.openai.com/v1/chat/completions`
      ]);
      setLoading(false);
    }, 2000);
  };

  const handleStopAgent = () => {
    setStatus(prev => ({ ...prev, isRunning: false }));
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Agent stopped`]);
  };

  const handleSaveConfig = () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Configuration saved`]);
  };

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'eliza-config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Eliza AI Agent
              </h1>
              <p className="text-muted-foreground">
                Configure and manage your research AI agent
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportConfig}>
                <Download className="w-4 h-4 mr-2" />
                Export Config
              </Button>
              <Button onClick={handleSaveConfig}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">
                      {status.isRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Uptime: {status.uptime}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Interactions: {status.totalInteractions}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Success Rate: {status.successRate}%
                  </div>
                </div>
                <div className="flex gap-2">
                  {status.isRunning ? (
                    <Button size="sm" onClick={handleStopAgent}>
                      <Pause className="w-3 h-3 mr-2" />
                      Stop Agent
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleStartAgent}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 mr-2" />
                      )}
                      {loading ? 'Starting...' : 'Start Agent'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 h-full">
          <Tabs defaultValue="configuration" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-6">
              <TabsContent value="configuration" className="h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Basic Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Configuration</CardTitle>
                      <CardDescription>
                        Core settings for your AI agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Agent Name</label>
                        <Input
                          value={config.name}
                          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea
                          value={config.description}
                          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Model</label>
                        <div className="space-y-2">
                          {availableModels.map(model => (
                            <div 
                              key={model.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                config.model === model.id 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:bg-muted/50'
                              }`}
                              onClick={() => setConfig(prev => ({ ...prev, model: model.id }))}
                            >
                              <div className="font-medium">{model.name}</div>
                              <div className="text-sm text-muted-foreground">{model.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Enabled</label>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advanced Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Settings</CardTitle>
                      <CardDescription>
                        Fine-tune your agent's behavior
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Temperature: {config.temperature}
                        </label>
                        <Slider
                          value={[config.temperature]}
                          onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
                          max={2}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Higher values make output more creative
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Max Tokens: {config.maxTokens}
                        </label>
                        <Slider
                          value={[config.maxTokens]}
                          onValueChange={([value]) => setConfig(prev => ({ ...prev, maxTokens: value }))}
                          max={4096}
                          min={256}
                          step={256}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Maximum response length
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">System Prompt</label>
                        <Textarea
                          value={config.systemPrompt}
                          onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          This defines your agent's role and behavior
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="monitoring" className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">{status.totalInteractions}</div>
                          <div className="text-sm text-muted-foreground">Total Interactions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-2xl font-bold">{status.successRate}%</div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="text-2xl font-bold">{status.uptime}</div>
                          <div className="text-sm text-muted-foreground">Uptime</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-2xl font-bold">{status.lastActivity}</div>
                          <div className="text-sm text-muted-foreground">Last Activity</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      Performance charts would be displayed here when the agent is running
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tools" className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Tools</CardTitle>
                    <CardDescription>
                      Enable tools that your agent can use
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {availableTools.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-sm text-muted-foreground">{tool.description}</div>
                          </div>
                          <Switch
                            checked={config.tools.includes(tool.id)}
                            onCheckedChange={(checked) => {
                              setConfig(prev => ({
                                ...prev,
                                tools: checked 
                                  ? [...prev.tools, tool.id]
                                  : prev.tools.filter(t => t !== tool.id)
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Agent Logs</CardTitle>
                    <CardDescription>
                      Real-time activity logs from your agent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-2 font-mono text-sm">
                        {logs.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            No logs yet. Start the agent to see activity.
                          </div>
                        ) : (
                          logs.map((log, index) => (
                            <div key={index} className="p-2 bg-muted rounded text-xs">
                              {log}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ElizaPlugin;