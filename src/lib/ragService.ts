import { openaiService } from './openai';
import { researchDataStore, SourcePaper, HypothesisWithSources } from './researchDataStore';

interface RAGConfig {
  maxSourcePapers: number;
  minConfidenceThreshold: number;
  requireMultipleSources: boolean;
  strictMode: boolean; // For medical/rare disease research
}

class RAGService {
  private config: RAGConfig = {
    maxSourcePapers: 5,
    minConfidenceThreshold: 70,
    requireMultipleSources: true,
    strictMode: true // Critical for medical research
  };

  // Extract and process PDF content from Google Drive or file upload
  async processPDFContent(sourcePaper: SourcePaper): Promise<void> {
    // Validate PDF content before processing
    if (!sourcePaper.extractedText || sourcePaper.extractedText.length < 10) {
      console.warn(`PDF ${sourcePaper.title} has insufficient content`);
      return;
    }
    
    // Enhanced text preprocessing for better searchability
    const processedText = this.preprocessTextForSearch(sourcePaper.extractedText);
    
    // Create enhanced relevant sections if not provided
    if (!sourcePaper.relevantSections || sourcePaper.relevantSections.length === 0) {
      sourcePaper.relevantSections = this.extractRelevantSections(processedText);
    }
    
    // Enhanced source paper with processed content
    const enhancedSourcePaper = {
      ...sourcePaper,
      extractedText: processedText,
      relevantSections: sourcePaper.relevantSections
    };
    
    // Process the source paper and add to data store
    researchDataStore.addPaper(enhancedSourcePaper);
    console.log(`✅ Processed PDF: ${sourcePaper.title} (${processedText.length} chars, ${sourcePaper.relevantSections.length} sections)`);
  }
  
  // Preprocess text for better search and analysis
  private preprocessTextForSearch(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Fix common PDF extraction issues
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/\b(\d+)([a-zA-Z])/g, '$1 $2') // Space between numbers and letters
      .replace(/([a-zA-Z])(\d+)/g, '$1 $2') // Space between letters and numbers
      // Clean up punctuation
      .replace(/\s*([.,;:!?])\s*/g, '$1 ')
      // Remove extra spaces
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  
  // Extract relevant sections from text for better organization
  private extractRelevantSections(text: string): string[] {
    const sections: string[] = [];
    
    // Split by common section markers
    const sectionDelimiters = /\n\s*(Abstract|Introduction|Methods?|Results?|Discussion|Conclusion|References?)\b/gi;
    const parts = text.split(sectionDelimiters);
    
    if (parts.length > 1) {
      // We found section headers - use structured sections
      for (let i = 1; i < parts.length; i += 2) {
        const header = parts[i];
        const content = parts[i + 1];
        if (content && content.trim().length > 100) {
          sections.push(`${header}: ${content.trim().substring(0, 1000)}`);
        }
      }
    } else {
      // No clear sections found - split by paragraphs
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
      
      // Take meaningful paragraphs
      paragraphs.slice(0, 10).forEach((paragraph, index) => {
        const cleanParagraph = paragraph.trim();
        if (cleanParagraph.length > 100) {
          sections.push(`Section ${index + 1}: ${cleanParagraph.substring(0, 1000)}`);
        }
      });
    }
    
    // Ensure we have at least some content
    if (sections.length === 0) {
      const chunks = text.match(/.{1,1000}/g) || [];
      chunks.slice(0, 5).forEach((chunk, index) => {
        sections.push(`Content Part ${index + 1}: ${chunk.trim()}`);
      });
    }
    
    return sections;
  }

  // Extract and process PDF content (this would integrate with actual PDF processing)
  async processPDFFile(file: File): Promise<SourcePaper> {
    // This is a placeholder - in real implementation, you'd use libraries like pdf-parse
    // or send to a backend service for processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockExtraction: SourcePaper = {
          id: `pdf_${Date.now()}`,
          title: file.name.replace('.pdf', ''),
          authors: ['Extracted from PDF'],
          url: URL.createObjectURL(file),
          extractedText: 'PDF content would be extracted here using proper PDF parsing libraries',
          relevantSections: [
            'Introduction section with key concepts',
            'Methodology explaining research approach', 
            'Results showing findings',
            'Discussion of implications'
          ],
          citationStyle: `${file.name} (PDF Document)`
        };
        
        // Add to data store
        researchDataStore.addPaper(mockExtraction);
        resolve(mockExtraction);
      }, 1000);
    });
  }

  // Generate hypothesis ONLY from available PDF sources
  async generateRAGHypothesis(
    userQuery: string,
    selectedPaperIds?: string[]
  ): Promise<{
    success: boolean;
    hypothesis?: HypothesisWithSources;
    error?: string;
    warnings: string[];
    sourceValidation: {
      isValid: boolean;
      confidence: number;
      supportingEvidence: any[];
    };
  }> {
    const warnings: string[] = [];
    
    try {
      // Get available papers
      let sourcePapers = selectedPaperIds 
        ? selectedPaperIds.map(id => researchDataStore.getPaper(id)).filter(Boolean) as SourcePaper[]
        : researchDataStore.getAllPapers();

      // Strict validation for medical research
      if (sourcePapers.length === 0) {
        return {
          success: false,
          error: "No PDF sources available. Please upload and process research papers first.",
          warnings: ["Critical: Cannot generate hypotheses without source papers"],
          sourceValidation: { isValid: false, confidence: 0, supportingEvidence: [] }
        };
      }

      if (this.config.requireMultipleSources && sourcePapers.length < 2) {
        warnings.push("Warning: Only one source paper available. Medical research requires multiple sources for validation.");
      }

      // Limit to most relevant papers
      sourcePapers = sourcePapers.slice(0, this.config.maxSourcePapers);

      // Create context from PDF extractions only (optimized for token usage)
      const contextFromPDFs = sourcePapers.map(paper => ({
        title: paper.title,
        authors: paper.authors.join(', '),
        content: paper.extractedText.length > 2000 
          ? paper.extractedText.substring(0, 2000) + '... [truncated for efficiency]'
          : paper.extractedText,
        sections: paper.relevantSections.slice(0, 3), // Limit to 3 most relevant sections
        citation: paper.citationStyle
      }));

      // Optimized prompt that minimizes tokens while ensuring zero hallucination
      const ragPrompt = `MEDICAL RESEARCH ANALYSIS - ZERO HALLUCINATION MODE

STRICT RULES:
1. Use ONLY the PDF content below
2. NO external knowledge
3. Cite specific papers for claims
4. If insufficient data, state "INSUFFICIENT DATA"

PDF SOURCES:
${contextFromPDFs.map((paper, index) => `
[${index + 1}] ${paper.title}
Authors: ${paper.authors}
Content: ${paper.content}
Sections: ${paper.sections.join('; ')}
`).join('\n')}

QUERY: ${userQuery}

Provide:
HYPOTHESIS: [Based only on above PDFs]
EVIDENCE: [Direct quotes with paper citations]
CONFIDENCE: [0-95% based on evidence strength]
LIMITATIONS: [Missing info/gaps]
SOURCES: [Paper citations that support hypothesis]
`;

      if (!openaiService.isConfigured()) {
        return {
          success: false,
          error: "OpenAI API not configured. Cannot generate hypotheses.",
          warnings,
          sourceValidation: { isValid: false, confidence: 0, supportingEvidence: [] }
        };
      }

      // Generate hypothesis using RAG approach
      const aiResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: 'You are a medical research analyst. Generate hypotheses ONLY from provided PDF sources. Never hallucinate or add external information.'
        },
        {
          role: 'user', 
          content: ragPrompt
        }
      ], 'gpt-4'); // Use more powerful model for medical research

      // Parse the structured response
      const parsedResponse = this.parseHypothesisResponse(aiResponse);
      
      // Validate against sources
      const sourceValidation = researchDataStore.validateHypothesisAgainstSources(
        parsedResponse.hypothesis,
        sourcePapers
      );

      // Strict confidence check for medical research
      if (sourceValidation.confidence < this.config.minConfidenceThreshold) {
        warnings.push(`Low confidence (${sourceValidation.confidence}%). Consider adding more source papers.`);
      }

      if (!sourceValidation.isValid) {
        return {
          success: false,
          error: "Generated hypothesis not sufficiently supported by source papers.",
          warnings: [...warnings, ...sourceValidation.warnings],
          sourceValidation
        };
      }

      // Create hypothesis with source tracking
      const hypothesis: Omit<HypothesisWithSources, 'knowledgeGraphNodeId'> = {
        id: `hyp_${Date.now()}`,
        title: parsedResponse.title || 'PDF-Based Hypothesis',
        description: parsedResponse.hypothesis,
        status: 'draft',
        confidence: Math.min(sourceValidation.confidence, parsedResponse.confidence || 85),
        sourcePapers: sourcePapers,
        extractedEvidence: sourceValidation.supportingEvidence.map(ev => ({
          paperId: ev.paperId,
          evidenceText: ev.evidenceText,
          section: 'Extracted Content'
        })),
        tags: ['RAG-generated', 'source-based'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to data store (this automatically creates knowledge graph node)
      const savedHypothesis = researchDataStore.addHypothesis(hypothesis);

      return {
        success: true,
        hypothesis: savedHypothesis,
        warnings,
        sourceValidation
      };

    } catch (error) {
      console.error('RAG hypothesis generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate hypothesis',
        warnings,
        sourceValidation: { isValid: false, confidence: 0, supportingEvidence: [] }
      };
    }
  }

  private parseHypothesisResponse(response: string): {
    hypothesis: string;
    title?: string;
    confidence?: number;
    limitations?: string;
    sources?: string[];
  } {
    // Parse structured AI response
    const hypothesisMatch = response.match(/HYPOTHESIS:\s*(.+?)(?=\n[A-Z]+:|$)/s);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)%?/);
    const limitationsMatch = response.match(/LIMITATIONS:\s*(.+?)(?=\n[A-Z]+:|$)/s);
    const sourcesMatch = response.match(/SOURCE PAPERS:\s*(.+?)(?=\n[A-Z]+:|$)/s);

    return {
      hypothesis: hypothesisMatch?.[1]?.trim() || response,
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : undefined,
      limitations: limitationsMatch?.[1]?.trim(),
      sources: sourcesMatch?.[1]?.split(',').map(s => s.trim())
    };
  }

  // Get all hypotheses with their source papers
  getHypothesesWithSources(): HypothesisWithSources[] {
    return researchDataStore.getAllHypotheses();
  }

  // Get all uploaded papers
  getSourcePapers(): SourcePaper[] {
    return researchDataStore.getAllPapers();
  }

  // Search through actual content with enhanced relevance scoring
  async searchPaperContent(query: string): Promise<{
    papers: SourcePaper[];
    relevantSections: { paperId: string; section: string; relevance: number; }[];
  }> {
    const searchResults = researchDataStore.searchByTerm(query);
    const relevantSections: { paperId: string; section: string; relevance: number; }[] = [];
    
    // Enhanced search - look in both extractedText and relevantSections
    searchResults.papers.forEach(paper => {
      // Search in main extracted text
      const mainTextRelevance = this.calculateAdvancedRelevance(query, paper.extractedText);
      if (mainTextRelevance > 0.1) {
        // Extract relevant excerpt from main text
        const excerpt = this.extractRelevantExcerpt(query, paper.extractedText);
        relevantSections.push({
          paperId: paper.id,
          section: `Main Content: ${excerpt}`,
          relevance: mainTextRelevance
        });
      }
      
      // Search in relevant sections
      paper.relevantSections.forEach((section, index) => {
        const sectionRelevance = this.calculateAdvancedRelevance(query, section);
        if (sectionRelevance > 0.1) {
          relevantSections.push({
            paperId: paper.id,
            section: section,
            relevance: sectionRelevance
          });
        }
      });
    });

    // Sort by relevance and remove duplicates
    const uniqueSections = relevantSections
      .sort((a, b) => b.relevance - a.relevance)
      .filter((section, index, arr) => 
        arr.findIndex(s => s.paperId === section.paperId && s.section === section.section) === index
      );

    return {
      papers: searchResults.papers,
      relevantSections: uniqueSections.slice(0, 10) // Limit to top 10 most relevant
    };
  }
  
  // Extract relevant excerpt around search terms
  private extractRelevantExcerpt(query: string, text: string, maxLength: number = 500): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Find sentences containing query terms
    const relevantSentences = sentences.filter(sentence => 
      queryWords.some(word => sentence.toLowerCase().includes(word))
    );
    
    if (relevantSentences.length === 0) {
      return text.substring(0, maxLength) + '...';
    }
    
    // Take the most relevant sentence and surrounding context
    const bestSentence = relevantSentences[0];
    const bestIndex = sentences.indexOf(bestSentence);
    
    // Include surrounding sentences for context
    const contextSentences = sentences.slice(
      Math.max(0, bestIndex - 1),
      Math.min(sentences.length, bestIndex + 3)
    );
    
    const excerpt = contextSentences.join('. ').trim();
    return excerpt.length > maxLength 
      ? excerpt.substring(0, maxLength) + '...'
      : excerpt;
  }
  
  // Advanced relevance calculation with multiple factors
  private calculateAdvancedRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textWords = text.toLowerCase().split(/\s+/);
    const textLength = textWords.length;
    
    if (queryWords.length === 0 || textLength === 0) return 0;
    
    let score = 0;
    let exactMatches = 0;
    let partialMatches = 0;
    
    queryWords.forEach(queryWord => {
      // Exact word matches
      const exactWordMatches = textWords.filter(word => word === queryWord).length;
      exactMatches += exactWordMatches;
      score += exactWordMatches * 2; // Higher weight for exact matches
      
      // Partial matches (word contains query term)
      const partialWordMatches = textWords.filter(word => 
        word.includes(queryWord) && word !== queryWord
      ).length;
      partialMatches += partialWordMatches;
      score += partialWordMatches * 0.5;
      
      // Phrase proximity bonus
      if (text.toLowerCase().includes(query.toLowerCase())) {
        score += 3; // Bonus for exact phrase
      }
    });
    
    // Normalize by text length and query complexity
    const normalizedScore = score / (textLength * 0.01 + queryWords.length);
    
    // Apply diminishing returns for very long texts
    const lengthPenalty = Math.min(1, 1000 / textLength);
    
    return Math.min(1, normalizedScore * lengthPenalty);
  }

  // Update configuration for different research domains
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): RAGConfig {
    return { ...this.config };
  }

  // Clear all data from stores
  clearAllData(): void {
    researchDataStore.clearAll();
    console.log('All RAG data cleared');
  }
}

export const ragService = new RAGService();