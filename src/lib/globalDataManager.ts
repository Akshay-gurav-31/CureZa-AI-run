import { create } from 'zustand';
import { researchDataStore, SourcePaper, HypothesisWithSources, KnowledgeGraphNode, GraphConnection } from './researchDataStore';
import { ragService } from './ragService';

interface GlobalDataState {
  // PDF Data
  sourcePapers: SourcePaper[];
  isGoogleDriveConnected: boolean;
  
  // Hypotheses
  hypotheses: HypothesisWithSources[];
  
  // Knowledge Graph
  knowledgeGraphNodes: KnowledgeGraphNode[];
  knowledgeGraphConnections: GraphConnection[];
  
  // Loading States
  loadingPDFs: boolean;
  loadingHypotheses: boolean;
  loadingKG: boolean;
  
  // Actions
  setGoogleDriveConnected: (connected: boolean) => void;
  addSourcePaper: (paper: SourcePaper) => void;
  addHypothesis: (hypothesis: HypothesisWithSources) => void;
  refreshAllData: () => void;
  searchPDFContent: (query: string) => Promise<{
    relevantContent: { paperId: string; content: string; relevance: number }[];
    hasRelevantContent: boolean;
  }>;
  clearAllData: () => void;
}

export const useGlobalData = create<GlobalDataState>((set, get) => ({
  // Initial State
  sourcePapers: [],
  isGoogleDriveConnected: false,
  hypotheses: [],
  knowledgeGraphNodes: [],
  knowledgeGraphConnections: [],
  loadingPDFs: false,
  loadingHypotheses: false,
  loadingKG: false,

  // Actions
  setGoogleDriveConnected: (connected: boolean) => {
    set({ isGoogleDriveConnected: connected });
  },

  addSourcePaper: (paper: SourcePaper) => {
    // Add to data store
    researchDataStore.addPaper(paper);
    
    // Update global state
    set(state => ({
      sourcePapers: [...state.sourcePapers, paper],
      knowledgeGraphNodes: researchDataStore.getKnowledgeGraphNodes(),
      knowledgeGraphConnections: researchDataStore.getKnowledgeGraphConnections()
    }));
  },

  addHypothesis: (hypothesis: HypothesisWithSources) => {
    set(state => ({
      hypotheses: [...state.hypotheses, hypothesis],
      knowledgeGraphNodes: researchDataStore.getKnowledgeGraphNodes(),
      knowledgeGraphConnections: researchDataStore.getKnowledgeGraphConnections()
    }));
  },

  refreshAllData: () => {
    const papers = researchDataStore.getAllPapers();
    const hypotheses = researchDataStore.getAllHypotheses();
    const nodes = researchDataStore.getKnowledgeGraphNodes();
    const connections = researchDataStore.getKnowledgeGraphConnections();

    set({
      sourcePapers: papers,
      hypotheses: hypotheses,
      knowledgeGraphNodes: nodes,
      knowledgeGraphConnections: connections
    });
  },

  searchPDFContent: async (query: string) => {
    const { sourcePapers } = get();
    
    if (sourcePapers.length === 0) {
      return {
        relevantContent: [],
        hasRelevantContent: false
      };
    }

    const searchResults = await ragService.searchPaperContent(query);
    
    const relevantContent = searchResults.relevantSections.map(section => ({
      paperId: section.paperId,
      content: section.section,
      relevance: section.relevance
    }));

    return {
      relevantContent,
      hasRelevantContent: relevantContent.length > 0 && relevantContent[0].relevance > 0.3
    };
  },

  clearAllData: () => {
    researchDataStore.clearAll();
    set({
      sourcePapers: [],
      hypotheses: [],
      knowledgeGraphNodes: [],
      knowledgeGraphConnections: [],
      isGoogleDriveConnected: false
    });
  }
}));