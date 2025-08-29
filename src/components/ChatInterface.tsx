import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, FileText, AlertTriangle, Upload } from "lucide-react";
import { openaiService } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useGlobalData } from "@/lib/globalDataManager";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { sourcePapers, isGoogleDriveConnected, searchPDFContent } = useGlobalData();

  // Initialize with simple message based on PDF availability
  useEffect(() => {
    const initialMessage: Message = {
      id: "1",
      content: sourcePapers.length > 0 
        ? `Hello! I have access to ${sourcePapers.length} research papers. Ask me anything about your uploaded PDFs.`
        : "Hello! Please upload PDF research papers first. I can only answer based on your actual PDF content.",
      role: "assistant",
      timestamp: new Date(),
    };
    
    setMessages([initialMessage]);
  }, [sourcePapers.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    const userInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      let assistantResponse: string;
      
      // Check if PDFs are available
      if (sourcePapers.length === 0) {
        assistantResponse = "❌ No PDF content available. Please upload research papers first to ask questions.";
      }
      // Check if OpenAI is configured
      else if (!openaiService.isConfigured()) {
        assistantResponse = "❌ OpenAI API not configured. Please check your environment variables.";
      }
      else {
        // Search PDF content for relevance
        const searchResult = await searchPDFContent(userInput);
        
        if (!searchResult.hasRelevantContent) {
          assistantResponse = `❌ No relevant content found for "${userInput}". Please ask about content from your uploaded PDFs.`;
        }
        else {
          // Create context from relevant PDF content
          const pdfContext = searchResult.relevantContent
            .slice(0, 3)
            .map(content => {
              const paper = sourcePapers.find(p => p.id === content.paperId);
              return `**From: ${paper?.title || 'Unknown'}**\n${content.content}`;
            }).join('\n\n');

          const strictPrompt = `You are a research assistant that ONLY answers based on provided PDF content.

PDF CONTENT:
${pdfContext}

USER QUESTION: ${userInput}

Answer based ONLY on the PDF content above. If insufficient information, state that clearly.`;

          assistantResponse = await openaiService.createChatCompletion([
            {
              role: 'system',
              content: 'Answer strictly from provided PDF content. No external knowledge.'
            },
            {
              role: 'user', 
              content: strictPrompt
            }
          ], 'gpt-4');
          
          // Add source attribution
          const sourceTitles = searchResult.relevantContent
            .slice(0, 3)
            .map(content => {
              const paper = sourcePapers.find(p => p.id === content.paperId);
              return paper?.title || 'Unknown Paper';
            });
          
          assistantResponse += `\n\n**📚 Sources:** ${sourceTitles.join(', ')}`;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantResponse,
        role: "assistant",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "❌ Error processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-chat-background">
      {/* Header with PDF Status */}
      <div className="border-b border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-primary" />
              <div>
                <h2 className="font-semibold">Research Assistant Chat</h2>
                <p className="text-sm text-muted-foreground">
                  {sourcePapers.length > 0 
                    ? `${sourcePapers.length} PDFs loaded - Ask questions about your research`
                    : "No PDFs loaded - Upload research papers first"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sourcePapers.length > 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <FileText className="w-3 h-3 mr-1" />
                  {sourcePapers.length} PDFs
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  No PDFs
                </Badge>
              )}
            </div>
          </div>
          
          {sourcePapers.length === 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Upload className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Upload PDFs to get started</p>
                  <p className="text-yellow-700">Connect Google Drive and select folders with PDFs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4">
        <ScrollArea className="h-full">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-chat-user text-primary-foreground"
                      : "bg-chat-assistant text-foreground border"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <p className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-chat-assistant text-foreground border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-sm">Searching your PDFs...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={sourcePapers.length > 0 
                ? "Ask about your research papers..."
                : "Upload PDFs first to ask questions..."
              }
              className="flex-1 bg-input border-border"
              disabled={sourcePapers.length === 0}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || sourcePapers.length === 0}
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {sourcePapers.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              ℹ️ Answers are based strictly on your uploaded PDFs. No external knowledge used.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;