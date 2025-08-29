import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Settings } from "lucide-react";
import { config, validateConfig } from "@/lib/config";
import { openaiService } from "@/lib/openai";
import { supabase } from "@/integrations/supabase/client";

const ConfigValidator = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runConfigTest = async () => {
    setTesting(true);
    const testResults: any = {
      envVars: {},
      apis: {},
      timestamp: new Date().toLocaleString()
    };

    // Test environment variables
    testResults.envVars = {
      openaiApiKey: !!config.openaiApiKey,
      googleClientId: !!config.google.clientId,
      googleDriveClientId: !!config.googleDrive.clientId,
      configValid: validateConfig()
    };

    // Test OpenAI API
    try {
      testResults.apis.openaiConfigured = openaiService.isConfigured();
      if (testResults.apis.openaiConfigured) {
        // Test simple API call
        const testResponse = await openaiService.createChatCompletion([
          { role: 'user', content: 'Say "API test successful"' }
        ]);
        testResults.apis.openaiWorking = testResponse.includes('API test successful');
      }
    } catch (error) {
      testResults.apis.openaiError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Supabase connection
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { action: 'test' }
      });
      testResults.apis.supabaseWorking = !error;
      if (error) {
        testResults.apis.supabaseError = error.message;
      }
    } catch (error) {
      testResults.apis.supabaseError = error instanceof Error ? error.message : 'Unknown error';
    }

    setResults(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === false) return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusBadge = (status: boolean | undefined, label: string) => {
    if (status === true) return <Badge className="bg-green-100 text-green-800">{label}: OK</Badge>;
    if (status === false) return <Badge variant="destructive">{label}: Failed</Badge>;
    return <Badge variant="secondary">{label}: Unknown</Badge>;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Configuration Validator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runConfigTest} 
          disabled={testing}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {testing ? 'Testing Configuration...' : 'Test System Configuration'}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Environment Variables
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {getStatusBadge(results.envVars.openaiApiKey, "OpenAI API Key")}
                {getStatusBadge(results.envVars.googleClientId, "Google Client ID")}
                {getStatusBadge(results.envVars.googleDriveClientId, "Google Drive Client ID")}
                {getStatusBadge(results.envVars.configValid, "Overall Config")}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                API Connectivity
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.apis.openaiConfigured)}
                  <span className="text-sm">OpenAI Configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.apis.openaiWorking)}
                  <span className="text-sm">OpenAI API Test</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(results.apis.supabaseWorking)}
                  <span className="text-sm">Supabase Functions</span>
                </div>
                
                {results.apis.openaiError && (
                  <div className="text-sm text-red-600 mt-2">
                    OpenAI Error: {results.apis.openaiError}
                  </div>
                )}
                {results.apis.supabaseError && (
                  <div className="text-sm text-red-600 mt-2">
                    Supabase Error: {results.apis.supabaseError}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Test completed at: {results.timestamp}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Purpose:</strong> Validate that all system components are properly configured.</p>
          <p><strong>If any tests fail:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Check your .env file contains all required variables</li>
            <li>Verify API keys are valid and not expired</li>
            <li>Ensure network connectivity to external services</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigValidator;