/**
 * IconPicker - Multi-mode icon selector supporting Lucide icons, emojis, and image uploads
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star, Heart, Home, User, Settings, Search, Image as ImageIcon,
  Folder, File, Mail, Bell, Calendar, Clock, Map, Tag, Flag,
  Check, X, Plus, Minus, Edit, Trash, Save, Upload, Download,
  Eye, Lock, Unlock, Share, Link, Phone, MessageSquare, Video,
  Camera, Mic, Volume2, Play, Pause, SkipBack, SkipForward,
  RefreshCw, RotateCw, ZoomIn, ZoomOut, Maximize, Minimize,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Menu,
  MoreHorizontal, MoreVertical, Grid, List, Filter, SortAsc,
  Package, Box, Archive, Inbox, Send, Paperclip, Hash,
  AtSign, DollarSign, Percent, AlertCircle, Info, HelpCircle,
  CheckCircle, XCircle, AlertTriangle, Zap, Target, Award,
  Bookmark, Briefcase, ShoppingCart, CreditCard, TrendingUp,
  Users, UserPlus, UserMinus, Building, Globe, MapPin,
  Wifi, Bluetooth, Battery, Power, Sun, Moon, Cloud,
  Umbrella, Wind, Droplet, Flame, Sparkles, Coffee,
  Pizza, Apple, Utensils, Wine, Gift, ShoppingBag,
  Truck, Plane, Car, Bike, Ship, Rocket, FileText,
  Table, Database, Server, HardDrive, Cpu, Code,
  Terminal, GitBranch, GitMerge, GitPullRequest, Bot,
  Layers, Layout, Columns, Rows, Square, Circle,
  Triangle, Hexagon, Pentagon, Network, Cable
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LUCIDE_ICONS = [
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Home', icon: Home },
  { name: 'User', icon: User },
  { name: 'Settings', icon: Settings },
  { name: 'Search', icon: Search },
  { name: 'Image', icon: ImageIcon },
  { name: 'Folder', icon: Folder },
  { name: 'File', icon: File },
  { name: 'FileText', icon: FileText },
  { name: 'Mail', icon: Mail },
  { name: 'Bell', icon: Bell },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'Map', icon: Map },
  { name: 'Tag', icon: Tag },
  { name: 'Flag', icon: Flag },
  { name: 'Check', icon: Check },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'X', icon: X },
  { name: 'XCircle', icon: XCircle },
  { name: 'Plus', icon: Plus },
  { name: 'Minus', icon: Minus },
  { name: 'Edit', icon: Edit },
  { name: 'Trash', icon: Trash },
  { name: 'Save', icon: Save },
  { name: 'Upload', icon: Upload },
  { name: 'Download', icon: Download },
  { name: 'Eye', icon: Eye },
  { name: 'Lock', icon: Lock },
  { name: 'Unlock', icon: Unlock },
  { name: 'Share', icon: Share },
  { name: 'Link', icon: Link },
  { name: 'Phone', icon: Phone },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Video', icon: Video },
  { name: 'Camera', icon: Camera },
  { name: 'Mic', icon: Mic },
  { name: 'Volume2', icon: Volume2 },
  { name: 'Play', icon: Play },
  { name: 'Pause', icon: Pause },
  { name: 'SkipBack', icon: SkipBack },
  { name: 'SkipForward', icon: SkipForward },
  { name: 'RefreshCw', icon: RefreshCw },
  { name: 'RotateCw', icon: RotateCw },
  { name: 'ZoomIn', icon: ZoomIn },
  { name: 'ZoomOut', icon: ZoomOut },
  { name: 'Maximize', icon: Maximize },
  { name: 'Minimize', icon: Minimize },
  { name: 'ChevronRight', icon: ChevronRight },
  { name: 'ChevronLeft', icon: ChevronLeft },
  { name: 'ChevronUp', icon: ChevronUp },
  { name: 'ChevronDown', icon: ChevronDown },
  { name: 'Menu', icon: Menu },
  { name: 'MoreHorizontal', icon: MoreHorizontal },
  { name: 'MoreVertical', icon: MoreVertical },
  { name: 'Grid', icon: Grid },
  { name: 'List', icon: List },
  { name: 'Filter', icon: Filter },
  { name: 'SortAsc', icon: SortAsc },
  { name: 'Package', icon: Package },
  { name: 'Box', icon: Box },
  { name: 'Archive', icon: Archive },
  { name: 'Inbox', icon: Inbox },
  { name: 'Send', icon: Send },
  { name: 'Paperclip', icon: Paperclip },
  { name: 'Hash', icon: Hash },
  { name: 'AtSign', icon: AtSign },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'Percent', icon: Percent },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'Info', icon: Info },
  { name: 'HelpCircle', icon: HelpCircle },
  { name: 'AlertTriangle', icon: AlertTriangle },
  { name: 'Zap', icon: Zap },
  { name: 'Target', icon: Target },
  { name: 'Award', icon: Award },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Users', icon: Users },
  { name: 'UserPlus', icon: UserPlus },
  { name: 'UserMinus', icon: UserMinus },
  { name: 'Building', icon: Building },
  { name: 'Globe', icon: Globe },
  { name: 'MapPin', icon: MapPin },
  { name: 'Wifi', icon: Wifi },
  { name: 'Bluetooth', icon: Bluetooth },
  { name: 'Battery', icon: Battery },
  { name: 'Power', icon: Power },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Cloud', icon: Cloud },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Wind', icon: Wind },
  { name: 'Droplet', icon: Droplet },
  { name: 'Flame', icon: Flame },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Coffee', icon: Coffee },
  { name: 'Pizza', icon: Pizza },
  { name: 'Apple', icon: Apple },
  { name: 'Utensils', icon: Utensils },
  { name: 'Wine', icon: Wine },
  { name: 'Gift', icon: Gift },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Truck', icon: Truck },
  { name: 'Plane', icon: Plane },
  { name: 'Car', icon: Car },
  { name: 'Bike', icon: Bike },
  { name: 'Ship', icon: Ship },
  { name: 'Rocket', icon: Rocket },
  { name: 'Table', icon: Table },
  { name: 'Database', icon: Database },
  { name: 'Server', icon: Server },
  { name: 'HardDrive', icon: HardDrive },
  { name: 'Cpu', icon: Cpu },
  { name: 'Code', icon: Code },
  { name: 'Terminal', icon: Terminal },
  { name: 'GitBranch', icon: GitBranch },
  { name: 'GitMerge', icon: GitMerge },
  { name: 'GitPullRequest', icon: GitPullRequest },
  { name: 'Bot', icon: Bot },
  { name: 'Layers', icon: Layers },
  { name: 'Layout', icon: Layout },
  { name: 'Columns', icon: Columns },
  { name: 'Rows', icon: Rows },
  { name: 'Square', icon: Square },
  { name: 'Circle', icon: Circle },
  { name: 'Triangle', icon: Triangle },
  { name: 'Hexagon', icon: Hexagon },
  { name: 'Pentagon', icon: Pentagon },
  { name: 'Network', icon: Network },
  { name: 'Cable', icon: Cable },
];

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
  '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
  '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '⭐', '🌟',
  '✨', '💫', '🔥', '💥', '💯', '✅', '🎯', '🎉', '🎊', '🎁',
  '🏆', '🥇', '🥈', '🥉', '🏅', '📌', '📍', '🚀', '💡', '🔔',
  '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📀', '📷',
  '🏠', '🏢', '🏪', '🏬', '🏭', '🏗️', '🌍', '🌎', '🌏', '🗺️',
];

interface IconPickerProps {
  value?: string;
  iconType?: 'lucide' | 'emoji' | 'image';
  iconUrl?: string | null;
  onChange: (icon: string, iconType: 'lucide' | 'emoji' | 'image', iconUrl?: string) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string) => void;
}

export function IconPicker({ 
  value = 'FileText', 
  iconType = 'lucide',
  iconUrl,
  onChange,
  onUploadStart,
  onUploadComplete 
}: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<'lucide' | 'emoji' | 'image'>(iconType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(value);
  const [selectedEmoji, setSelectedEmoji] = useState(iconType === 'emoji' ? value : '😀');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(iconUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredIcons = LUCIDE_ICONS.filter(icon =>
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onChange(iconName, 'lucide');
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onChange(emoji, 'emoji');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('icon', file);

    try {
      setIsUploading(true);
      onUploadStart?.();
      
      const response = await fetch('/api/menu/upload-icon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setUploadedImageUrl(data.url);
      onChange(file.name, 'image', data.url);
      onUploadComplete?.(data.url);
    } catch (error) {
      console.error('Icon upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'lucide' | 'emoji' | 'image');
    
    // Trigger onChange with current selection for the new tab
    if (tab === 'lucide') {
      onChange(selectedIcon, 'lucide');
    } else if (tab === 'emoji') {
      onChange(selectedEmoji, 'emoji');
    } else if (tab === 'image' && uploadedImageUrl) {
      onChange(uploadedImageUrl.split('/').pop() || '', 'image', uploadedImageUrl);
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lucide" data-testid="tab-lucide">
            <Star className="h-4 w-4 mr-2" />
            Icons
          </TabsTrigger>
          <TabsTrigger value="emoji" data-testid="tab-emoji">
            <span className="mr-2">😀</span>
            Emoji
          </TabsTrigger>
          <TabsTrigger value="image" data-testid="tab-image">
            <ImageIcon className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lucide" className="mt-4 space-y-3">
          <div>
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              data-testid="input-icon-search"
            />
          </div>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleIconSelect(name)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-md hover:bg-accent transition-colors",
                    selectedIcon === name && activeTab === 'lucide' && "bg-primary/10 ring-2 ring-primary"
                  )}
                  title={name}
                  data-testid={`icon-${name}`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium">{selectedIcon}</span>
          </div>
        </TabsContent>

        <TabsContent value="emoji" className="mt-4">
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-md hover:bg-accent transition-colors text-2xl",
                    selectedEmoji === emoji && activeTab === 'emoji' && "bg-primary/10 ring-2 ring-primary"
                  )}
                  data-testid={`emoji-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="text-sm text-muted-foreground mt-2">
            Selected: <span className="font-medium text-lg">{selectedEmoji}</span>
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-4 space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="icon-upload"
              data-testid="input-image-upload"
            />
            <label htmlFor="icon-upload" className="cursor-pointer">
              {uploadedImageUrl ? (
                <div className="space-y-2">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Uploaded icon" 
                    className="h-16 w-16 mx-auto object-contain"
                  />
                  <p className="text-sm text-muted-foreground">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? 'Uploading...' : 'Click to upload image'}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</p>
                </div>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
