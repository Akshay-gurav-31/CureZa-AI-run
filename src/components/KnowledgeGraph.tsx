import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { researchDataStore, KnowledgeGraphNode, GraphConnection } from "@/lib/researchDataStore";
import { useGlobalData } from "@/lib/globalDataManager";
import { ragService } from "@/lib/ragService";
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Settings2,
  Download,
  Share,
  Filter,
  Search,
  Maximize,
  Info,
  Layers,
  RefreshCw,
  FileText,
  Lightbulb,
  Brain
} from "lucide-react";

const KnowledgeGraph = () => {
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [edges, setEdges] = useState<GraphConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState([100]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const canvasRef = useRef<HTMLDivElement>(null);
  const { sourcePapers, isGoogleDriveConnected } = useGlobalData();
  const [pdfCount, setPdfCount] = useState(0);

  // Load real graph data from research data store and PDF sources
  const loadGraphData = async () => {
    setLoading(true);
    try {
      // Get knowledge graph data from research store
      const graphNodes = researchDataStore.getKnowledgeGraphNodes();
      const graphConnections = researchDataStore.getKnowledgeGraphConnections();
      
      // Get PDF paper data from global state
      const currentSourcePapers = ragService.getSourcePapers();
      setPdfCount(currentSourcePapers.length);
      
      // If we have papers but no graph nodes, generate basic paper nodes
      if (currentSourcePapers.length > 0 && graphNodes.length === 0) {
        const paperNodes: KnowledgeGraphNode[] = currentSourcePapers.map((paper, index) => ({
          id: `paper_${paper.id}`,
          label: paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title,
          type: "paper",
          sourceType: "pdf_extracted",
          importance: 0.7 + (Math.random() * 0.3), // Random importance between 0.7-1.0
          metadata: {
            description: `Research paper: ${paper.title}`,
            sourcePapers: [paper.id]
          },
          connections: []
        }));
        
        setNodes([...graphNodes, ...paperNodes]);
      } else {
        setNodes(graphNodes);
      }
      
      setEdges(graphConnections);
      
      if (graphNodes.length === 0 && currentSourcePapers.length === 0) {
        console.log('No graph data or PDF papers available');
      }
    } catch (error) {
      console.error('Error loading graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, []);
  
  // Reload when papers change
  useEffect(() => {
    loadGraphData();
  }, [sourcePapers]);

  const generateSampleGraph = () => {
    // Get actual data from store first
    const realNodes = researchDataStore.getKnowledgeGraphNodes();
    const realEdges = researchDataStore.getKnowledgeGraphConnections();
    
    if (realNodes.length > 0) {
      setNodes(realNodes);
      setEdges(realEdges);
      return;
    }
    
    // Only generate sample if no real data exists
    const sampleNodes: KnowledgeGraphNode[] = [
      {
        id: "sample_1",
        label: "Rare Disease Research",
        type: "concept",
        sourceType: "pdf_extracted",
        importance: 0.9,
        metadata: { description: "Core concepts in rare disease research" },
        connections: ["sample_2", "sample_3"]
      },
      {
        id: "sample_2", 
        label: "Sample Research Paper",
        type: "paper",
        sourceType: "paper_metadata",
        importance: 0.8,
        metadata: { description: "Example research paper" },
        connections: ["sample_1", "sample_4"]
      },
      {
        id: "sample_3",
        label: "Gene Therapy Hypothesis",
        type: "hypothesis",
        sourceType: "pdf_extracted",
        importance: 0.85,
        metadata: { confidence: 85, description: "Hypothesis about gene therapy effectiveness" },
        connections: ["sample_1", "sample_2"]
      }
    ];

    const sampleEdges: GraphConnection[] = [
      {
        sourceId: "sample_1",
        targetId: "sample_2",
        type: "relates_to",
        weight: 0.8,
        evidence: []
      },
      {
        sourceId: "sample_3",
        targetId: "sample_2",
        type: "derived_from",
        weight: 0.9,
        evidence: []
      }
    ];

    setNodes(sampleNodes);
    setEdges(sampleEdges);
  };

  const resetView = () => {
    setZoomLevel([100]);
    setSelectedNode(null);
  };

  const nodeTypeColors = {
    paper: "bg-blue-100 text-blue-800 border-blue-200",
    author: "bg-green-100 text-green-800 border-green-200", 
    concept: "bg-purple-100 text-purple-800 border-purple-200",
    hypothesis: "bg-orange-100 text-orange-800 border-orange-200",
    evidence: "bg-yellow-100 text-yellow-800 border-yellow-200"
  };

  const edgeTypeColors = {
    supports: "stroke-green-500",
    contradicts: "stroke-red-500",
    relates_to: "stroke-purple-500",
    derived_from: "stroke-blue-500",
    cites: "stroke-gray-500"
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading knowledge graph...</p>
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
              <h1 className="text-2xl font-semibold text-foreground">Knowledge Graph</h1>
              <p className="text-muted-foreground">
                {nodes.length > 0 
                  ? `Visualizing ${nodes.length} entities and ${edges.length} connections`
                  : "Visualize relationships between your research"
                }
                {pdfCount > 0 && (
                  <span className="ml-2">• {pdfCount} PDF papers loaded</span>
                )}
                {!isGoogleDriveConnected && (
                  <span className="ml-2 text-orange-600">• Connect Google Drive for more data</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={generateSampleGraph}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Sample
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setZoomLevel([Math.min(200, zoomLevel[0] + 25)])}>
                <ZoomIn className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setZoomLevel([Math.max(25, zoomLevel[0] - 25)])}>
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-sm text-muted-foreground">{zoomLevel[0]}%</span>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "2d" ? "default" : "outline"}
                onClick={() => setViewMode("2d")}
              >
                2D
              </Button>
              <Button
                size="sm"
                variant={viewMode === "3d" ? "default" : "outline"}
                onClick={() => setViewMode("3d")}
              >
                3D
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button size="sm" variant="outline" onClick={resetView}>
              <RotateCcw className="w-3 h-3 mr-2" />
              Reset View
            </Button>

            <Button size="sm" variant="outline">
              <Settings2 className="w-3 h-3 mr-2" />
              Layout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Graph Area */}
        <div className="flex-1 relative">
          <div
            ref={canvasRef}
            className="w-full h-full bg-graph-background border-r border-border relative overflow-hidden"
            style={{ transform: `scale(${zoomLevel[0] / 100})` }}
          >
            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Network className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Knowledge Graph Data</h3>
                  <p className="text-muted-foreground max-w-md">
                    {pdfCount === 0 ? (
                      "Upload PDF research papers and create hypotheses to generate a knowledge graph showing relationships between papers, concepts, and research findings."
                    ) : (
                      "Create hypotheses based on your uploaded papers to generate knowledge graph connections. The graph will automatically show relationships between papers, hypotheses, and extracted concepts."
                    )}
                  </p>
                  {pdfCount === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                      <h4 className="font-medium text-yellow-800 mb-2">Getting Started:</h4>
                      <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                        <li>Connect Google Drive to access your research papers</li>
                        <li>Upload PDF research papers to the system</li>
                        <li>Create or generate hypotheses based on the papers</li>
                        <li>Knowledge graph will automatically populate with connections</li>
                      </ol>
                    </div>
                  )}
                  <Button onClick={generateSampleGraph}>
                    <Network className="w-4 h-4 mr-2" />
                    {pdfCount > 0 ? "Show Paper Nodes" : "Generate Sample"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 p-8">
                {/* SVG Graph Visualization */}
                <svg width="100%" height="100%" className="border rounded-lg bg-white">
                  {/* Edges */}
                  {edges.map((edge, index) => {
                    // Simplified positioning for demo
                    const sourceNode = nodes.find(n => n.id === edge.sourceId);
                    const targetNode = nodes.find(n => n.id === edge.targetId);
                    if (!sourceNode || !targetNode) return null;
                    
                    const x1 = 100 + (parseInt(edge.sourceId.replace(/[^0-9]/g, '') || '0') * 150);
                    const y1 = 100 + (parseInt(edge.sourceId.replace(/[^0-9]/g, '') || '0') * 100);
                    const x2 = 100 + (parseInt(edge.targetId.replace(/[^0-9]/g, '') || '0') * 150);
                    const y2 = 100 + (parseInt(edge.targetId.replace(/[^0-9]/g, '') || '0') * 100);
                    
                    return (
                      <line
                        key={index}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className={`${edgeTypeColors[edge.type]} stroke-2 opacity-60`}
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                  
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="10"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        className="fill-current text-muted-foreground"
                      />
                    </marker>
                  </defs>

                  {/* Nodes */}
                  {nodes.map((node, index) => {
                    const x = 100 + (index * 150);
                    const y = 100 + (index * 100);
                    const radius = 20 + ((node.importance || 0.5) * 20);
                    
                    return (
                      <g key={node.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r={radius}
                          className={`cursor-pointer transition-all hover:scale-110 ${
                            selectedNode?.id === node.id 
                              ? 'stroke-primary stroke-4' 
                              : 'stroke-border stroke-2'
                          }`}
                          fill={node.type === 'paper' ? '#3b82f6' : 
                                node.type === 'author' ? '#10b981' :
                                node.type === 'concept' ? '#8b5cf6' :
                                node.type === 'hypothesis' ? '#f59e0b' : '#6b7280'}
                          fillOpacity={0.8}
                          onClick={() => setSelectedNode(node)}
                        />
                        <text
                          x={x}
                          y={y + 5}
                          textAnchor="middle"
                          className="text-xs font-medium fill-white pointer-events-none"
                        >
                          {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Zoom Control */}
          <div className="absolute bottom-4 left-4 bg-background border border-border rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setZoomLevel([Math.min(200, zoomLevel[0] + 25)])}>
                <ZoomIn className="w-3 h-3" />
              </Button>
              <div className="w-24">
                <Slider
                  value={zoomLevel}
                  onValueChange={setZoomLevel}
                  max={200}
                  min={25}
                  step={25}
                  className="w-full"
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => setZoomLevel([Math.max(25, zoomLevel[0] - 25)])}>
                <ZoomOut className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-background border border-border rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-semibold">Node Types</h4>
            {Object.entries(nodeTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className={`w-3 h-3 rounded-full border ${color}`} />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 border-l border-border bg-card">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Graph Details</h3>
                <Button size="sm" variant="ghost">
                  <Info className="w-3 h-3" />
                </Button>
              </div>

              {selectedNode ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {selectedNode.label}
                      <Badge variant="outline" className={nodeTypeColors[selectedNode.type]}>
                        {selectedNode.type}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedNode.connections?.length || 0} connections • Importance: {Math.round((selectedNode.importance || 0.5) * 100)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedNode.metadata.description && (
                        <div>
                          <p className="text-sm font-medium mb-1">Description</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedNode.metadata.description}
                          </p>
                        </div>
                      )}
                      
                      {selectedNode.metadata.field && (
                        <div>
                          <p className="text-sm font-medium mb-1">Field</p>
                          <Badge variant="secondary">{selectedNode.metadata.field}</Badge>
                        </div>
                      )}

                      {selectedNode.metadata.confidence && (
                        <div>
                          <p className="text-sm font-medium mb-1">Confidence</p>
                          <p className="text-sm text-muted-foreground">{selectedNode.metadata.confidence}%</p>
                        </div>
                      )}

                      {selectedNode.sourceType && (
                        <div>
                          <p className="text-sm font-medium mb-1">Source Type</p>
                          <Badge variant="outline" className="text-xs">
                            {selectedNode.sourceType.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}

                      {selectedNode.metadata.sourcePapers && selectedNode.metadata.sourcePapers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Source Papers</p>
                          <div className="space-y-2">
                            {selectedNode.metadata.sourcePapers.slice(0, 2).map((paperId, index) => {
                              const paper = researchDataStore.getPaper(paperId);
                              if (!paper) return null;
                              return (
                                <div key={index} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                  <div className="font-medium text-blue-800">{paper.title}</div>
                                  <div className="text-blue-600">{paper.authors?.join(', ')}</div>
                                </div>
                              );
                            })}
                            {selectedNode.metadata.sourcePapers.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{selectedNode.metadata.sourcePapers.length - 2} more papers
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Network className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click on a node to see details
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-3">Graph Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Nodes:</span>
                    <span>{nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Edges:</span>
                    <span>{edges.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PDF Papers:</span>
                    <span>{pdfCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hypotheses:</span>
                    <span>{researchDataStore.getAllHypotheses().length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Density:</span>
                    <span>{nodes.length > 1 ? Math.round((edges.length / (nodes.length * (nodes.length - 1))) * 100) : 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drive Status:</span>
                    <Badge variant={isGoogleDriveConnected ? "default" : "secondary"} className="text-xs">
                      {isGoogleDriveConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-3">Node Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(
                    nodes.reduce((acc, node) => {
                      acc[node.type] = (acc[node.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;