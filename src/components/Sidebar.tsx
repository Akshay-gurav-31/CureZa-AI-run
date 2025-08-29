import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  FileText, 
  Network, 
  Settings, 
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import DriveConnection from "./DriveConnection";
import { ActiveView } from "@/pages/Index";
import { useGlobalData } from "@/lib/globalDataManager";

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isGoogleDriveConnected, sourcePapers } = useGlobalData();

  const features = [
    { icon: MessageCircle, label: "Chat", view: "chat" as ActiveView },
    { icon: FileText, label: "Research Papers", view: "papers" as ActiveView },
    { icon: Lightbulb, label: "Hypotheses", view: "hypotheses" as ActiveView },
    { icon: Network, label: "Knowledge Graph", view: "graph" as ActiveView },
    { icon: Brain, label: "Eliza Plugin", view: "eliza" as ActiveView },
    { icon: Settings, label: "Settings", view: "settings" as ActiveView },
  ];

  return (
    <div className={`h-full bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-80"
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">CureZa AI</h1>
                <p className="text-sm text-muted-foreground">Powered by Eliza</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Drive Connection */}
            {!isCollapsed && <DriveConnection />}
            
            <Separator />

            {/* Navigation */}
            <div className="space-y-2">
              {features.map((feature, index) => (
                <Button
                  key={index}
                  variant={activeView === feature.view ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
                  size={isCollapsed ? "icon" : "default"}
                  onClick={() => onViewChange(feature.view)}
                >
                  <feature.icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span className="ml-2">{feature.label}</span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Status */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center justify-between mb-1">
                <span>Status</span>
                <Badge variant="outline" className="text-xs">
                  {isGoogleDriveConnected ? "Connected" : "Ready"}
                </Badge>
              </div>
              <div>
                {isGoogleDriveConnected 
                  ? `${sourcePapers.length} PDFs loaded from Drive`
                  : "Connect Google Drive to begin analysis"
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;