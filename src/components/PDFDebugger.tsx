import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Bug, CheckCircle, AlertCircle } from "lucide-react";

interface DebugResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const PDFDebugger = ({ accessToken, testFileId }: { accessToken: string; testFileId: string }) => {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const { toast } = useToast();

  const addDebugResult = (step: string, success: boolean, data?: any, error?: string) => {
    const result: DebugResult = {
      step,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    };
    setDebugResults(prev => [...prev, result]);
  };

  const runDebugTest = async () => {
    setDebugging(true);
    setDebugResults([]);

    try {
      // Step 1: Test Supabase function connectivity
      addDebugResult("Supabase Function Test", true, "Starting PDF debug test");

      // Step 2: Test file download
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { 
          action: 'download_pdf',
          access_token: accessToken,
          file_id: testFileId
        }
      });

      if (error) {
        addDebugResult("Supabase Function Call", false, null, error.message);
        return;
      }

      addDebugResult("Supabase Function Call", true, data);

      // Step 3: Analyze response
      if (data?.success) {
        addDebugResult("PDF Processing Success", true, {
          contentLength: data.content?.length || 0,
          extractedLength: data.extractedLength || 0,
          sectionCount: data.sectionCount || 0,
          extractionMethods: data.extractionMethods || [],
          textQuality: data.extractionInfo?.textQuality || 'unknown'
        });

        if (data.content && data.content.length > 0) {
          addDebugResult("Content Validation", true, {
            hasContent: true,
            contentPreview: data.content.substring(0, 200) + '...',
            wordCount: data.content.split(' ').length
          });
        } else {
          addDebugResult("Content Validation", false, null, "No content extracted");
        }
      } else {
        addDebugResult("PDF Processing Failed", false, data, data?.error || "Unknown error");
      }

    } catch (error) {
      addDebugResult("Debug Test Failed", false, null, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDebugging(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-orange-500" />
          PDF Extraction Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runDebugTest} 
            disabled={debugging || !testFileId}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {debugging ? 'Debugging...' : 'Run Debug Test'}
          </Button>
          <Badge variant="outline">
            Test File: {testFileId ? testFileId.substring(0, 8) + '...' : 'No file selected'}
          </Badge>
        </div>

        {debugResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium">Debug Results:</h4>
            {debugResults.map((result, index) => (
              <div key={index} className={`p-3 border rounded-lg ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{result.step}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{result.timestamp}</span>
                </div>
                
                {result.error && (
                  <div className="text-sm text-red-600 mb-2">
                    Error: {result.error}
                  </div>
                )}
                
                {result.data && (
                  <div className="text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Purpose:</strong> This debugger tests the PDF extraction pipeline to identify why PDFs might fail to process.</p>
          <p><strong>What it tests:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Supabase function connectivity</li>
            <li>Google Drive API access</li>
            <li>PDF download process</li>
            <li>Text extraction methods</li>
            <li>Content validation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFDebugger;