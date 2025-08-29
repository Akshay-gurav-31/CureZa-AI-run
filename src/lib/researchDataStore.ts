// Central data store for managing relationships between hypotheses, papers, and knowledge graph
export interface SourcePaper {
  id: string;
  title: string;
  authors: string[];
  url: string;
  extractedText: string;
  relevantSections: string[];
  citationStyle: string;
}

export interface HypothesisWithSources {
  id: string;
  title: string;
  description: string;
  status: "draft" | "testing" | "validated" | "rejected";
  confidence: number;
  sourcePapers: SourcePaper[];
  extractedEvidence: {
    paperId: string;
    evidenceText: string;
    pageNumber?: number;
    section: string;
  }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  knowledgeGraphNodeId?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: "paper" | "hypothesis" | "concept" | "evidence" | "author";
  sourceType: "pdf_extracted" | "user_generated" | "paper_metadata";
  importance: number;
  metadata: {
    sourcePapers?: string[];
    confidence?: number;
    extractedFrom?: string;
    pageReferences?: number[];
    section?: string;
    description?: string;
    field?: string;
    year?: number;
    citations?: number;
  };
  connections: string[];
  position?: { x: number; y: number };
}

export interface GraphConnection {
  sourceId: string;
  targetId: string;
  type: "supports" | "contradicts" | "relates_to" | "derived_from" | "cites";
  weight: number;
  evidence: {
    paperId: string;
    evidenceText: string;
    confidence: number;
  }[];
}

class ResearchDataStore {
  private static instance: ResearchDataStore;
  private hypotheses: Map<string, HypothesisWithSources> = new Map();
  private papers: Map<string, SourcePaper> = new Map();
  private knowledgeGraph: Map<string, KnowledgeGraphNode> = new Map();
  private connections: Map<string, GraphConnection> = new Map();

  static getInstance(): ResearchDataStore {
    if (!ResearchDataStore.instance) {
      ResearchDataStore.instance = new ResearchDataStore();
    }
    return ResearchDataStore.instance;
  }

  // Paper management
  addPaper(paper: SourcePaper): void {
    this.papers.set(paper.id, paper);
    
    // Create knowledge graph node for the paper
    const paperNode: KnowledgeGraphNode = {
      id: `paper_${paper.id}`,
      label: paper.title,
      type: "paper",
      sourceType: "paper_metadata",
      importance: 0.8,
      metadata: {
        description: `Research paper: ${paper.title}`,
        sourcePapers: [paper.id]
      },
      connections: []
    };
    this.knowledgeGraph.set(paperNode.id, paperNode);
  }

  getPaper(id: string): SourcePaper | undefined {
    return this.papers.get(id);
  }

  getAllPapers(): SourcePaper[] {
    return Array.from(this.papers.values());
  }

  // Hypothesis management with automatic knowledge graph integration
  addHypothesis(hypothesis: Omit<HypothesisWithSources, 'knowledgeGraphNodeId'>): HypothesisWithSources {
    // Validate that all source papers exist
    const missingPapers = hypothesis.sourcePapers.filter(paper => !this.papers.has(paper.id));
    if (missingPapers.length > 0) {
      throw new Error(`Missing source papers: ${missingPapers.map(p => p.id).join(', ')}`);
    }

    // Create knowledge graph node for hypothesis
    const nodeId = `hypothesis_${hypothesis.id}`;
    const hypothesisNode: KnowledgeGraphNode = {
      id: nodeId,
      label: hypothesis.title,
      type: "hypothesis",
      sourceType: "pdf_extracted",
      importance: hypothesis.confidence / 100,
      metadata: {
        sourcePapers: hypothesis.sourcePapers.map(p => p.id),
        confidence: hypothesis.confidence,
        description: hypothesis.description
      },
      connections: []
    };

    // Add the hypothesis with knowledge graph node ID
    const fullHypothesis: HypothesisWithSources = {
      ...hypothesis,
      knowledgeGraphNodeId: nodeId
    };

    this.hypotheses.set(hypothesis.id, fullHypothesis);
    this.knowledgeGraph.set(nodeId, hypothesisNode);

    // Create connections to source papers
    hypothesis.sourcePapers.forEach(paper => {
      const paperNodeId = `paper_${paper.id}`;
      const connectionId = `${nodeId}_to_${paperNodeId}`;
      
      const connection: GraphConnection = {
        sourceId: nodeId,
        targetId: paperNodeId,
        type: "derived_from",
        weight: 0.8,
        evidence: hypothesis.extractedEvidence
          .filter(ev => ev.paperId === paper.id)
          .map(ev => ({
            paperId: paper.id,
            evidenceText: ev.evidenceText,
            confidence: hypothesis.confidence / 100
          }))
      };

      this.connections.set(connectionId, connection);
      
      // Update node connections
      hypothesisNode.connections.push(paperNodeId);
      const paperNode = this.knowledgeGraph.get(paperNodeId);
      if (paperNode) {
        paperNode.connections.push(nodeId);
      }
    });

    return fullHypothesis;
  }

  getHypothesis(id: string): HypothesisWithSources | undefined {
    return this.hypotheses.get(id);
  }

  getAllHypotheses(): HypothesisWithSources[] {
    return Array.from(this.hypotheses.values());
  }

  // Knowledge graph access
  getKnowledgeGraphNodes(): KnowledgeGraphNode[] {
    return Array.from(this.knowledgeGraph.values());
  }

  getKnowledgeGraphConnections(): GraphConnection[] {
    return Array.from(this.connections.values());
  }

  // RAG-based hypothesis generation validation
  validateHypothesisAgainstSources(
    hypothesisText: string, 
    sourcePapers: SourcePaper[]
  ): {
    isValid: boolean;
    confidence: number;
    supportingEvidence: { paperId: string; evidenceText: string; relevance: number; }[];
    warnings: string[];
  } {
    const supportingEvidence: { paperId: string; evidenceText: string; relevance: number; }[] = [];
    const warnings: string[] = [];
    
    // Check if hypothesis concepts are found in source papers
    const hypothesisWords = hypothesisText.toLowerCase().split(/\s+/);
    let totalRelevance = 0;
    
    sourcePapers.forEach(paper => {
      const paperText = paper.extractedText.toLowerCase();
      const relevantSections = paper.relevantSections;
      
      // Check concept overlap
      const foundConcepts = hypothesisWords.filter(word => 
        word.length > 3 && paperText.includes(word)
      );
      
      if (foundConcepts.length > 0) {
        const relevance = foundConcepts.length / hypothesisWords.length;
        totalRelevance += relevance;
        
        // Extract supporting text
        relevantSections.forEach(section => {
          if (section.toLowerCase().includes(foundConcepts[0])) {
            supportingEvidence.push({
              paperId: paper.id,
              evidenceText: section,
              relevance
            });
          }
        });
      } else {
        warnings.push(`No supporting evidence found in paper: ${paper.title}`);
      }
    });

    const avgRelevance = totalRelevance / sourcePapers.length;
    const confidence = Math.min(avgRelevance * 100, 95); // Max 95% to indicate source-based nature

    return {
      isValid: avgRelevance > 0.3, // At least 30% concept overlap required
      confidence,
      supportingEvidence,
      warnings
    };
  }

  // Update knowledge graph when hypothesis status changes
  updateHypothesisStatus(hypothesisId: string, newStatus: HypothesisWithSources['status']): void {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) return;

    hypothesis.status = newStatus;
    hypothesis.updatedAt = new Date().toISOString();

    // Update knowledge graph node
    if (hypothesis.knowledgeGraphNodeId) {
      const node = this.knowledgeGraph.get(hypothesis.knowledgeGraphNodeId);
      if (node) {
        node.metadata.confidence = hypothesis.confidence;
        // Update node color/style based on status in UI
      }
    }

    this.hypotheses.set(hypothesisId, hypothesis);
  }

  // Search across all data with source tracking
  searchByTerm(term: string): {
    papers: SourcePaper[];
    hypotheses: HypothesisWithSources[];
    knowledgeNodes: KnowledgeGraphNode[];
  } {
    const lowerTerm = term.toLowerCase();
    
    const papers = Array.from(this.papers.values()).filter(paper =>
      paper.title.toLowerCase().includes(lowerTerm) ||
      paper.extractedText.toLowerCase().includes(lowerTerm) ||
      paper.authors.some(author => author.toLowerCase().includes(lowerTerm))
    );

    const hypotheses = Array.from(this.hypotheses.values()).filter(hyp =>
      hyp.title.toLowerCase().includes(lowerTerm) ||
      hyp.description.toLowerCase().includes(lowerTerm)
    );

    const knowledgeNodes = Array.from(this.knowledgeGraph.values()).filter(node =>
      node.label.toLowerCase().includes(lowerTerm) ||
      node.metadata.description?.toLowerCase().includes(lowerTerm)
    );

    return { papers, hypotheses, knowledgeNodes };
  }

  // Export data for backup/analysis
  exportData() {
    return {
      papers: Array.from(this.papers.entries()),
      hypotheses: Array.from(this.hypotheses.entries()),
      knowledgeGraph: Array.from(this.knowledgeGraph.entries()),
      connections: Array.from(this.connections.entries()),
      timestamp: new Date().toISOString()
    };
  }

  // Clear all data
  clearAll(): void {
    this.papers.clear();
    this.hypotheses.clear();
    this.knowledgeGraph.clear();
    this.connections.clear();
  }
}

export const researchDataStore = ResearchDataStore.getInstance();