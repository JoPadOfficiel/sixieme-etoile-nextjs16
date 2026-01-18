"use client";

import { cn } from "@ui/lib";
import { DispatchHeader } from "./DispatchHeader";

interface DispatchLayoutProps {
  sidebar: React.ReactNode;
  inspector?: React.ReactNode;
  children: React.ReactNode;
  isSidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export function DispatchLayout({
  sidebar,
  inspector,
  children,
  isSidebarCollapsed,
  onSidebarToggle
}: DispatchLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <DispatchHeader />
      
      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Backlog) */}
        {sidebar}
        
        {/* Center Main Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
          {children}
        </main>
        
        {/* Right Inspector */}
        {inspector}
      </div>
    </div>
  );
}
