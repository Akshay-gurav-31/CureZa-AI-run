import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import ResearchPapers from "@/components/ResearchPapers";
import Hypotheses from "@/components/Hypotheses";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ElizaPlugin from "@/components/ElizaPlugin";
import Settings from "@/components/Settings";

export type ActiveView = "chat" | "papers" | "hypotheses" | "graph" | "eliza" | "settings";

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>("chat");

  const renderActiveView = () => {
    switch (activeView) {
      case "chat":
        return <ChatInterface />;
      case "papers":
        return <ResearchPapers />;
      case "hypotheses":
        return <Hypotheses />;
      case "graph":
        return <KnowledgeGraph />;
      case "eliza":
        return <ElizaPlugin />;
      case "settings":
        return <Settings />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {renderActiveView()}
      </div>
    </div>
  );
};

export default Index;
