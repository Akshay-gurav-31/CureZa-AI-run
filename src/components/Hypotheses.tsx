import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ragService } from "@/lib/ragService";
import { researchDataStore, HypothesisWithSources } from "@/lib/researchDataStore";
import { useGlobalData } from "@/lib/globalDataManager";
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Filter, 
  ThumbsUp, 
  ThumbsDown,
  Star,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  AlertTriangle,
  Upload,
  ExternalLink
} from "lucide-react";

interface Hypothesis {
  id: string;
  title: string;
  description: string;
  status: "draft" | "testing" | "validated" | "rejected";
  confidence: number;
  relatedPapers: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  evidence: string[];
  contradictions: string[];
}

const Hypotheses = () => {
  const [hypotheses, setHypotheses] = useState<HypothesisWithSources[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showNewHypothesis, setShowNewHypothesis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [newHypothesis, setNewHypothesis] = useState({
    title: "",
    description: "",
    tags: "",
    query: ""
  });
  const { toast } = useToast();
  const { sourcePapers: globalPapers, isGoogleDriveConnected, addSourcePaper } = useGlobalData();
  const [sourcePapers, setSourcePapers] = useState(ragService.getSourcePapers());

  // Load hypotheses from data store
  const loadHypotheses = async () => {
    setLoading(true);
    try {
      const storedHypotheses = ragService.getHypothesesWithSources();
      setHypotheses(storedHypotheses);
      
      // Sync with global papers data
      const currentSourcePapers = ragService.getSourcePapers();
      setSourcePapers(currentSourcePapers);
      
      // Update global state if needed - add any new papers to global store
      currentSourcePapers.forEach(paper => {
        const exists = globalPapers.some(gp => gp.id === paper.id);
        if (!exists) {
          addSourcePaper(paper);
        }
      });
    } catch (error) {
      console.error('Error loading hypotheses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHypotheses();
  }, []);
  
  // Sync with global papers state
  useEffect(() => {
    const currentSourcePapers = ragService.getSourcePapers();
    setSourcePapers(currentSourcePapers);
  }, [globalPapers]);

  // Handle PDF file upload
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPDF(true);
    try {
      const processedPapers = [];
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          const paper = await ragService.processPDFFile(file);
          processedPapers.push(paper);
          toast({
            title: "PDF Uploaded",
            description: `Successfully processed ${file.name}`
          });
        } else {
          toast({
            title: "Invalid File",
            description: "Please upload PDF files only",
            variant: "destructive"
          });
        }
      }
      
      // Update global state and local state
      const updatedSourcePapers = ragService.getSourcePapers();
      setSourcePapers(updatedSourcePapers);
      
      // Add new papers to global store
      processedPapers.forEach(paper => {
        addSourcePaper(paper);
      });
      
    } catch (error) {
      console.error('PDF processing error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process PDF file",
        variant: "destructive"
      });
    } finally {
      setUploadingPDF(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleCreateHypothesis = () => {
    if (!newHypothesis.title.trim() || !newHypothesis.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and description",
        variant: "destructive"
      });
      return;
    }

    if (sourcePapers.length === 0) {
      toast({
        title: "No Source Papers",
        description: "Please upload PDF papers first to ensure hypothesis is based on real research",
        variant: "destructive"
      });
      return;
    }

    try {
      const hypothesis: Omit<HypothesisWithSources, 'knowledgeGraphNodeId'> = {
        id: Date.now().toString(),
        title: newHypothesis.title,
        description: newHypothesis.description,
        status: "draft",
        confidence: 50,
        sourcePapers: sourcePapers.slice(0, 3), // Use first 3 papers as sources
        extractedEvidence: [],
        tags: newHypothesis.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const savedHypothesis = researchDataStore.addHypothesis(hypothesis);
      setHypotheses(prev => [savedHypothesis, ...prev]);
      setNewHypothesis({ title: "", description: "", tags: "", query: "" });
      setShowNewHypothesis(false);
      
      toast({
        title: "Hypothesis Created",
        description: "Hypothesis has been added to knowledge graph"
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create hypothesis",
        variant: "destructive"
      });
    }
  };

  const generateAIHypothesis = async () => {
    if (sourcePapers.length === 0) {
      toast({
        title: "No Source Papers",
        description: "Please upload PDF research papers first. RAG-based hypothesis generation requires source documents.",
        variant: "destructive"
      });
      return;
    }

    if (!newHypothesis.query.trim()) {
      toast({
        title: "Research Query Required",
        description: "Please specify what you want to investigate based on your papers",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const result = await ragService.generateRAGHypothesis(newHypothesis.query);
      
      if (!result.success) {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate hypothesis",
          variant: "destructive"
        });
        
        if (result.warnings.length > 0) {
          console.warn('RAG Warnings:', result.warnings);
        }
        return;
      }

      if (result.hypothesis) {
        setHypotheses(prev => [result.hypothesis!, ...prev]);
        setNewHypothesis({ title: "", description: "", tags: "", query: "" });
        setShowNewHypothesis(false);
        
        toast({
          title: "RAG Hypothesis Generated",
          description: `Generated with ${result.sourceValidation.confidence}% confidence from ${result.hypothesis.sourcePapers.length} source papers`
        });
        
        if (result.warnings.length > 0) {
          toast({
            title: "Generation Warnings",
            description: result.warnings.join('; '),
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('Error generating RAG hypothesis:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate hypothesis from source papers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHypothesisStatus = (id: string, status: HypothesisWithSources["status"]) => {
    researchDataStore.updateHypothesisStatus(id, status);
    setHypotheses(prev => prev.map(h => 
      h.id === id ? { ...h, status, updatedAt: new Date().toISOString() } : h
    ));
  };

  const deleteHypothesis = (id: string) => {
    setHypotheses(prev => prev.filter(h => h.id !== id));
    // Note: In full implementation, this would also remove from data store
  };

  const filteredHypotheses = hypotheses.filter(hypothesis => {
    const matchesSearch = hypothesis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hypothesis.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || hypothesis.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    testing: "bg-blue-100 text-blue-800",
    validated: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };

  const statusCounts = {
    all: hypotheses.length,
    draft: hypotheses.filter(h => h.status === "draft").length,
    testing: hypotheses.filter(h => h.status === "testing").length,
    validated: hypotheses.filter(h => h.status === "validated").length,
    rejected: hypotheses.filter(h => h.status === "rejected").length
  };

  if (loading && hypotheses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading hypotheses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Research Hypotheses</h1>
              <p className="text-muted-foreground">
                {hypotheses.length > 0 
                  ? `${hypotheses.length} hypotheses in development` 
                  : "Create and manage your research hypotheses"
                }
                {sourcePapers.length > 0 && (
                  <span className="ml-2">• {sourcePapers.length} source papers loaded</span>
                )}
                {!isGoogleDriveConnected && sourcePapers.length === 0 && (
                  <span className="ml-2 text-orange-600">• Connect Google Drive for research papers</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <label htmlFor="pdf-upload">
                <Button 
                  variant="outline" 
                  disabled={uploadingPDF}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {uploadingPDF ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploadingPDF ? 'Processing...' : 'Upload PDFs'}
                  </span>
                </Button>
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                multiple
                onChange={handlePDFUpload}
                className="hidden"
              />
                          
              {/* Hypothesis Generation Options */}
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  onClick={generateAIHypothesis}
                  disabled={loading || sourcePapers.length === 0}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {loading ? "Generating..." : "Auto Generate"}
                </Button>
                <Button 
                  onClick={() => setShowNewHypothesis(true)}
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Custom Hypothesis
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Status Filter */}
          <div className="flex gap-4 items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hypotheses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                  className="capitalize"
                >
                  {status} ({count})
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Hypothesis Form */}
      {showNewHypothesis && (
        <div className="border-b border-border p-6 bg-muted/50">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Hypothesis</h3>
              <div className="flex items-center gap-2">
                {sourcePapers.length === 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No source papers
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  Custom Entry
                </Badge>
              </div>
            </div>
            
              {sourcePapers.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">No Source Papers Available</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        For medical/rare disease research with zero hallucination, all hypotheses must be based on actual research papers. 
                        {!isGoogleDriveConnected ? (
                          "Please connect Google Drive and upload PDF papers first."
                        ) : (
                          "Please upload PDF papers to ensure accuracy and prevent hallucination."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            
            <div className="space-y-3">
              <Input
                placeholder="Hypothesis title..."
                value={newHypothesis.title}
                onChange={(e) => setNewHypothesis(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Describe your hypothesis in detail..."
                value={newHypothesis.description}
                onChange={(e) => setNewHypothesis(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
              <Input
                placeholder="Research query for AI generation (e.g., 'relationship between gene X and disease Y')..."
                value={newHypothesis.query}
                onChange={(e) => setNewHypothesis(prev => ({ ...prev, query: e.target.value }))}
              />
              <Input
                placeholder="Tags (comma-separated)..."
                value={newHypothesis.tags}
                onChange={(e) => setNewHypothesis(prev => ({ ...prev, tags: e.target.value }))}
              />
              
              {sourcePapers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Available Source Papers:</h4>
                  <div className="space-y-1">
                    {sourcePapers.slice(0, 3).map(paper => (
                      <div key={paper.id} className="text-sm text-green-700 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        <span>{paper.title}</span>
                      </div>
                    ))}
                    {sourcePapers.length > 3 && (
                      <div className="text-sm text-green-600">+ {sourcePapers.length - 3} more papers</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateHypothesis}
                  disabled={!newHypothesis.title.trim() || !newHypothesis.description.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom
                </Button>
                <Button 
                  variant="outline" 
                  onClick={generateAIHypothesis}
                  disabled={loading || !newHypothesis.query.trim() || sourcePapers.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Auto Generate'}
                </Button>
                <Button variant="outline" onClick={() => setShowNewHypothesis(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto p-6">
          {hypotheses.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Hypotheses Yet</h3>
              <p className="text-muted-foreground mb-6">
                {sourcePapers.length === 0 ? (
                  "Upload PDF research papers first, then create hypotheses or let AI generate them based on your papers. Zero hallucination - all hypotheses will be based on your actual research."
                ) : (
                  "Start creating hypotheses or let AI generate them based on your research papers."
                )}
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setShowNewHypothesis(true)}
                  disabled={sourcePapers.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Hypothesis
                </Button>
                <Button 
                  variant="outline" 
                  onClick={generateAIHypothesis}
                  disabled={sourcePapers.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Auto Generate from PDFs
                </Button>
              </div>
              {sourcePapers.length === 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-800 mb-2">Getting Started:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside text-left">
                    <li>Connect Google Drive to access research papers</li>
                    <li>Upload PDF files containing your research papers</li>
                    <li>Create or generate hypotheses based on the papers</li>
                    <li>View connections in the Knowledge Graph</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHypotheses.map(hypothesis => (
                <Card key={hypothesis.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {hypothesis.title}
                          <Badge className={statusColors[hypothesis.status]}>
                            {hypothesis.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          Created: {new Date(hypothesis.createdAt).toLocaleDateString()}
                          {hypothesis.updatedAt !== hypothesis.createdAt && (
                            <span className="ml-2">
                              • Updated: {new Date(hypothesis.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteHypothesis(hypothesis.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {hypothesis.description}
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Confidence Level</span>
                            <span>{hypothesis.confidence}%</span>
                          </div>
                          <Progress value={hypothesis.confidence} className="h-2" />
                        </div>
                      </div>

                      {hypothesis.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {hypothesis.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Source Papers */}
                      {hypothesis.sourcePapers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Source Papers ({hypothesis.sourcePapers.length})
                          </p>
                          <div className="space-y-1">
                            {hypothesis.sourcePapers.slice(0, 2).map(paper => (
                              <div key={paper.id} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="font-medium text-blue-800">{paper.title}</div>
                                <div className="text-blue-600">{paper.authors.join(', ')}</div>
                                {paper.url && (
                                  <button 
                                    onClick={() => window.open(paper.url, '_blank')}
                                    className="text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View Paper
                                  </button>
                                )}
                              </div>
                            ))}
                            {hypothesis.sourcePapers.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{hypothesis.sourcePapers.length - 2} more sources
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Extracted Evidence */}
                      {hypothesis.extractedEvidence.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Supporting Evidence</p>
                          <div className="space-y-1">
                            {hypothesis.extractedEvidence.slice(0, 2).map((evidence, index) => (
                              <div key={index} className="text-xs bg-green-50 border border-green-200 rounded p-2">
                                <div className="text-green-800 italic">"{evidence.evidenceText}"</div>
                                <div className="text-green-600 mt-1">
                                  Source: {hypothesis.sourcePapers.find(p => p.id === evidence.paperId)?.title || 'Unknown'}
                                  {evidence.section && ` - ${evidence.section}`}
                                  {evidence.pageNumber && ` (Page ${evidence.pageNumber})`}
                                </div>
                              </div>
                            ))}
                            {hypothesis.extractedEvidence.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{hypothesis.extractedEvidence.length - 2} more evidence pieces
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateHypothesisStatus(hypothesis.id, "testing")}
                            disabled={hypothesis.status === "testing"}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateHypothesisStatus(hypothesis.id, "validated")}
                            disabled={hypothesis.status === "validated"}
                          >
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            Validate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateHypothesisStatus(hypothesis.id, "rejected")}
                            disabled={hypothesis.status === "rejected"}
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hypothesis.sourcePapers.length} source papers • 
                          {hypothesis.extractedEvidence.length} evidence pieces •
                          {researchDataStore.getKnowledgeGraphNodes().filter(n => 
                            n.metadata.sourcePapers?.some(paperId => 
                              hypothesis.sourcePapers.some(hp => hp.id === paperId)
                            )
                          ).length} graph nodes
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Hypotheses;