import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardDrive, CheckCircle, Loader2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/lib/config";
import { useGlobalData } from "@/lib/globalDataManager";
import { ragService } from "@/lib/ragService";
import FolderSelector from "./FolderSelector";
import PDFDebugger from "./PDFDebugger";

interface PDFFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
}

const DriveConnection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedPdfs, setSelectedPdfs] = useState<PDFFile[]>([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [debugFileId, setDebugFileId] = useState<string>('');
  const { toast } = useToast();
  const { setGoogleDriveConnected, addSourcePaper, sourcePapers } = useGlobalData();

  useEffect(() => {
    // Check for access token in URL (after OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    const error = urlParams.get('error');
    
    console.log('URL params:', { token: token ? 'present' : 'missing', error });
    
    if (error) {
      toast({
        title: "Authentication Failed",
        description: "Could not connect to Google Drive. Please try again.",
        variant: "destructive"
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (token) {
      console.log('Setting access token and connecting...');
      setAccessToken(token);
      setIsConnected(true);
      setGoogleDriveConnected(true);
      setShowFolderSelector(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      toast({
        title: "Google Drive Connected",
        description: "Successfully authenticated with Google Drive. Select a folder to analyze PDFs.",
      });
    }
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Check if API keys are configured
      if (!config.googleDrive.clientId) {
        throw new Error('Google Drive API keys not configured');
      }

      // Try to use Supabase function first
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { 
          action: 'get_auth_url',
          client_id: config.googleDrive.clientId,
          redirect_uri: config.googleDrive.redirectUri
        }
      });
      
      if (error) {
        console.warn('Supabase function failed, using direct OAuth:', error);
        // Fallback to direct Google OAuth
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${config.googleDrive.clientId}&` +
          `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
          `response_type=token&` +
          `scope=https://www.googleapis.com/auth/drive.readonly&` +
          `access_type=offline`;
        
        window.location.href = authUrl;
        return;
      }
      
      if (data?.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed", 
        description: error instanceof Error ? error.message : "Could not connect to Google Drive. Please check your API configuration.",
        variant: "destructive"
      });
    }
  };

  // Process PDFs and download content with proper error handling
  const processPDFsFromDrive = async (pdfs: PDFFile[]) => {
    setProcessingPdfs(true);
    
    try {
      let processedCount = 0;
      let totalTokens = 0;
      let failedPdfs: string[] = [];
      
      toast({
        title: "Processing PDFs",
        description: `Starting to process ${pdfs.length} PDF files...`
      });
      
      for (let i = 0; i < pdfs.length; i++) {
        const pdf = pdfs[i];
        let retryCount = 0;
        const maxRetries = 2;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            const { data } = await supabase.functions.invoke('google-drive-auth', {
              body: { 
                action: 'download_pdf',
                access_token: accessToken,
                file_id: pdf.id
              }
            });
            
            if (data?.success && data?.content && data.content.length > 0) {
              // Validate content quality
              const contentLength = data.content.length;
              const hasLetters = /[a-zA-Z]/.test(data.content);
              const wordCount = data.content.split(/\s+/).filter(w => w.length > 0).length;
              
              const hasMinimalContent = contentLength > 20 && hasLetters && wordCount > 5;
              
              if (!hasMinimalContent) {
                throw new Error(`Insufficient content quality: ${contentLength} chars, ${wordCount} words`);
              }
              
              // Create source paper
              const sourcePaper = {
                id: pdf.id,
                title: pdf.name.replace('.pdf', ''),
                authors: ['Google Drive PDF'], 
                url: `https://drive.google.com/file/d/${pdf.id}/view`,
                extractedText: data.content,
                relevantSections: data.sections && data.sections.length > 0 
                  ? data.sections 
                  : data.content.split('\n\n').filter(section => section.length > 50).slice(0, 5),
                citationStyle: `${pdf.name.replace('.pdf', '')} (Google Drive PDF)`
              };
              
              const tokenCount = data.extractedLength || data.content.length;
              totalTokens += tokenCount;
              
              // Process through RAG service
              await ragService.processPDFContent(sourcePaper);
              addSourcePaper(sourcePaper);
              processedCount++;
              success = true;
              
              if (i % 5 === 0 || i === pdfs.length - 1) {
                toast({
                  title: "PDF Processed",
                  description: `✅ "${pdf.name}" processed successfully (${i + 1}/${pdfs.length})`
                });
              }
              
            } else {
              throw new Error(`No content extracted: ${data?.error || 'Unknown extraction error'}`);
            }
            
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              failedPdfs.push(pdf.name);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      // Final summary
      if (processedCount > 0) {
        toast({
          title: "🎉 Processing Complete!",
          description: `Successfully processed ${processedCount} of ${pdfs.length} PDFs. Ready for chat and analysis!`
        });
        
        if (failedPdfs.length > 0) {
          toast({
            title: "Some PDFs Failed",
            description: `${failedPdfs.length} PDFs could not be processed. They may be corrupted or contain only images.`,
            variant: "destructive"
          });
        }
      } else {
        const firstFailedPdf = pdfs[0];
        if (firstFailedPdf) {
          setDebugFileId(firstFailedPdf.id);
        }
        
        toast({
          title: "No PDFs Processed",
          description: "Could not extract text from any PDF files. Click 'Debug PDF Issues' for help.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error processing PDFs:', error);
      toast({
        title: "Processing Error",
        description: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setProcessingPdfs(false);
    }
  };

  const handleFoldersSelect = async (folders: Array<{folderId: string; pdfs: PDFFile[]}>) => {
    const allPdfs = folders.reduce((acc, folder) => [...acc, ...folder.pdfs], [] as PDFFile[]);
    
    setSelectedPdfs(allPdfs);
    setShowFolderSelector(false);
    
    if (allPdfs.length === 0) {
      toast({
        title: "No PDFs Found",
        description: "No PDF files were found in the selected folders.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Folders Selected",
      description: `Found ${allPdfs.length} PDF files from ${folders.length} folders. Processing...`,
    });
    
    // Process PDFs automatically
    await processPDFsFromDrive(allPdfs);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAccessToken(null);
    setSelectedPdfs([]);
    setShowFolderSelector(false);
    setGoogleDriveConnected(false);
    
    // Clear PDFs from global state and RAG service
    ragService.clearAllData();
    
    toast({
      title: "Disconnected",
      description: "Google Drive has been disconnected. All PDF data cleared.",
    });
  };

  return (
    <>
      {showFolderSelector && accessToken ? (
        <FolderSelector
          accessToken={accessToken}
          onFoldersSelect={handleFoldersSelect}
          onBack={() => setShowFolderSelector(false)}
        />
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-drive-connect" />
              Google Drive Connection
            </CardTitle>
            <CardDescription>
              Connect your Google Drive to access research papers and PDFs for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not connected to Google Drive</span>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-drive-connect hover:bg-drive-connect/90 text-white"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4 mr-2" />
                      Connect Google Drive
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-drive-connect" />
                  <span className="text-sm font-medium">Connected to Google Drive</span>
                  <Badge variant="secondary" className="ml-auto">
                    <FileText className="w-3 h-3 mr-1" />
                    {sourcePapers.length} PDFs processed
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {sourcePapers.length > 0 
                    ? `✅ ${sourcePapers.length} PDFs processed and available in Chat, Knowledge Graph, and Hypotheses. Total text: ${sourcePapers.reduce((total, paper) => total + paper.extractedText.length, 0)} characters.`
                    : selectedPdfs.length > 0
                    ? `⏳ ${selectedPdfs.length} PDFs selected, processing...`
                    : "Your Google Drive is connected. Click 'Select Folder' to choose research papers for analysis."
                  }
                  {processingPdfs && (
                    <div className="mt-2 flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Extracting PDF text content...</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowFolderSelector(true)}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={processingPdfs}
                  >
                    {processingPdfs ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Select Folder"
                    )}
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                  {debugFileId && (
                    <Button
                      onClick={() => setShowDebugger(!showDebugger)}
                      variant="outline"
                      size="sm"
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                    >
                      {showDebugger ? 'Hide' : 'Debug'} PDF Issues
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
        
      {/* PDF Debugger - shown when there are PDF processing issues */}
      {showDebugger && debugFileId && accessToken && (
        <div className="mt-4">
          <PDFDebugger accessToken={accessToken} testFileId={debugFileId} />
        </div>
      )}
    </>
  );
};

export default DriveConnection;