import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Database, Network, Package, Menu, Settings, Book, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import PageManager from './PageManager';
import MenuBuilder from './dev-tools/MenuBuilder';

export default function DevTools() {
  const [activeTab, setActiveTab] = useState('pages');
  const [, setLocation] = useLocation();

  const tabOptions = [
    { value: 'pages', label: 'Page Manager', icon: FileText },
    { value: 'menu', label: 'Menu Manager', icon: Menu }
  ];

  return (
    <div className="h-full p-4">
      {/* Page Title - Mobile: Single line with dropdown */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Settings className="h-5 w-5 sm:h-8 sm:w-8 flex-shrink-0" />
          <h1 className="text-lg sm:text-3xl font-bold truncate">
            Developer Tools
          </h1>
        </div>
        
        {/* Documentation Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/dev-tools/documentation')}
          className="flex items-center gap-2"
        >
          <Book className="h-4 w-4" />
          <span className="hidden sm:inline">Documentation</span>
          <ExternalLink className="h-3 w-3" />
        </Button>
        
        {/* Mobile: Inline Dropdown */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue>
                {(() => {
                  const currentTab = tabOptions.find(tab => tab.value === activeTab);
                  const Icon = currentTab?.icon || FileText;
                  return (
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      <span className="truncate">{currentTab?.label.split(' ')[0]}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop: Description */}
      <div className="hidden sm:block mb-6">
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage pages, features, and platform configuration
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100%-100px)] sm:h-[calc(100%-120px)]">
        {/* Desktop: Tab List */}
        <TabsList className="hidden sm:grid w-fit grid-cols-2">
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Page Manager
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Menu Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="h-full mt-0 sm:mt-4">
          <PageManager />
        </TabsContent>

        <TabsContent value="menu" className="h-full mt-0 sm:mt-4">
          <MenuBuilder />
        </TabsContent>


      </Tabs>
    </div>
  );
}