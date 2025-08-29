import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, FileText, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Folder {
  id: string;
  name: string;
}

interface PDFFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
}

interface FolderSelectorProps {
  accessToken: string;
  onFoldersSelect: (folders: Array<{folderId: string; pdfs: PDFFile[]}>) => void;
  onBack: () => void;
}

const FolderSelector = ({ accessToken, onFoldersSelect, onBack }: FolderSelectorProps) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderPdfs, setFolderPdfs] = useState<Map<string, PDFFile[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('google-drive-auth', {
        body: { 
          action: 'list_folders',
          access_token: accessToken
        }
      });

      if (data?.files) {
        setFolders(data.files);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
    setLoading(false);
  };

  const toggleFolderSelection = async (folderId: string, folderName: string) => {
    if (selectedFolders.has(folderId)) {
      // Deselect folder
      const newSelected = new Set(selectedFolders);
      newSelected.delete(folderId);
      setSelectedFolders(newSelected);
      
      const newFolderPdfs = new Map(folderPdfs);
      newFolderPdfs.delete(folderId);
      setFolderPdfs(newFolderPdfs);
    } else {
      // Select folder and load its PDFs
      const newSelected = new Set(selectedFolders);
      newSelected.add(folderId);
      setSelectedFolders(newSelected);
      
      const newLoadingFolders = new Set(loadingFolders);
      newLoadingFolders.add(folderId);
      setLoadingFolders(newLoadingFolders);
      
      try {
        const { data } = await supabase.functions.invoke('google-drive-auth', {
          body: { 
            action: 'list_pdfs',
            access_token: accessToken,
            folder_id: folderId
          }
        });
        
        if (data?.files) {
          const newFolderPdfs = new Map(folderPdfs);
          newFolderPdfs.set(folderId, data.files);
          setFolderPdfs(newFolderPdfs);
        }
      } catch (error) {
        console.error(`Error loading PDFs from folder ${folderName}:`, error);
        // Remove from selection if loading failed
        const newSelected = new Set(selectedFolders);
        newSelected.delete(folderId);
        setSelectedFolders(newSelected);
      } finally {
        const newLoadingFolders = new Set(loadingFolders);
        newLoadingFolders.delete(folderId);
        setLoadingFolders(newLoadingFolders);
      }
    }
  };

  const handleAnalyzeSelected = () => {
    const selectedFoldersData = Array.from(selectedFolders).map(folderId => ({
      folderId,
      pdfs: folderPdfs.get(folderId) || []
    }));
    
    onFoldersSelect(selectedFoldersData);
  };
  
  const totalPdfs = Array.from(folderPdfs.values()).reduce((total, pdfs) => total + pdfs.length, 0);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-drive-connect" />
            Select Research Folders
          </span>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground mb-4">
          Select multiple folders containing research papers. PDFs from all selected folders will be analyzed together.
        </div>
        
        {folders.length > 0 ? (
          <>
            {folders.map((folder) => {
              const isSelected = selectedFolders.has(folder.id);
              const isLoading = loadingFolders.has(folder.id);
              const pdfCount = folderPdfs.get(folder.id)?.length || 0;
              
              return (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleFolderSelection(folder.id, folder.name)}
                      disabled={isLoading}
                    />
                    <Folder className={`w-4 h-4 ${
                      isSelected ? 'text-primary' : 'text-drive-connect'
                    }`} />
                    <div>
                      <span className="text-sm font-medium">{folder.name}</span>
                      {isSelected && pdfCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {pdfCount} PDF files found
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {isSelected && !isLoading && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {pdfCount} PDFs
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            
            {selectedFolders.size > 0 && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm font-medium text-primary mb-2">
                  Selected: {selectedFolders.size} folders • {totalPdfs} total PDFs
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Array.from(selectedFolders).map(folderId => {
                    const folder = folders.find(f => f.id === folderId);
                    const pdfCount = folderPdfs.get(folderId)?.length || 0;
                    return (
                      <div key={folderId} className="flex justify-between">
                        <span>{folder?.name}</span>
                        <span>{pdfCount} PDFs</span>
                      </div>
                    );
                  })}
                </div>
                <Button 
                  className="w-full mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handleAnalyzeSelected}
                  disabled={totalPdfs === 0 || loadingFolders.size > 0}
                >
                  {loadingFolders.size > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading PDFs...
                    </>
                  ) : (
                    `Analyze ${totalPdfs} PDFs from ${selectedFolders.size} folders`
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            No folders found in your Google Drive
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FolderSelector;