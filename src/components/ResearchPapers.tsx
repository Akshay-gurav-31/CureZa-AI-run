import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Tag,
  RefreshCw,
  Upload
} from "lucide-react";

interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  publishDate: string;
  tags: string[];
  source: string;
  url?: string;
  fileSize?: string;
  downloadCount?: number;
}

const ResearchPapers = () => {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Simulate loading papers from Google Drive
  const loadPapers = async () => {
    setLoading(true);
    // This would be replaced with actual Google Drive API integration
    setTimeout(() => {
      // Simulated empty state - real data would come from Google Drive
      setPapers([]);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const filteredPapers = papers.filter(paper => 
    paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
    paper.abstract.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allTags = Array.from(new Set(papers.flatMap(paper => paper.tags)));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading research papers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Research Papers</h1>
              <p className="text-muted-foreground">
                {papers.length > 0 
                  ? `${papers.length} papers found` 
                  : "Connect Google Drive to access your research papers"
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadPapers} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Papers
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search papers by title, author, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {allTags.slice(0, 10).map(tag => (
                <Badge 
                  key={tag} 
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto p-6">
          {papers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Research Papers Found</h3>
              <p className="text-muted-foreground mb-6">
                Connect your Google Drive to access your research papers and start analyzing them.
              </p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Connect Google Drive
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPapers.map(paper => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{paper.title}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3 h-3" />
                        {paper.publishDate}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Authors:</p>
                        <p className="text-sm text-muted-foreground">
                          {paper.authors.join(", ")}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {paper.abstract}
                        </p>
                      </div>

                      {paper.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {paper.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {paper.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{paper.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        {paper.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {paper.fileSize}
                          </span>
                        )}
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

export default ResearchPapers;