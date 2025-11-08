import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Palette, 
  Download, 
  Upload, 
  RotateCcw,
  Eye,
  Sun,
  Moon,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Settings,
  Type,
  Layout,
  Building
} from "lucide-react";
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  sidebar: string;
  sidebarForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  success: string;
  warning: string;
  border: string;
  ring: string;
  radius: string;
  notificationBg: string;
  notificationFg: string;
}

interface BrandSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  favicon: string;
  primaryFont: string;
  headingFont: string;
}

interface LayoutSettings {
  fontSize: string;
  fontScale: string;
  spacing: string;
  verticalSpacing: string;
  contentWidth: string;
  sidebarWidth: string;
  h1Size: string;
  h2Size: string;
  h3Size: string;
  h4Size: string;
  h5Size: string;
  h6Size: string;
  smallSize: string;
  tinySize: string;
  buttonSmallSize: string;
  buttonDefaultSize: string;
  buttonLargeSize: string;
  buttonRadius: string;
  buttonPrimaryBg: string;
  buttonSecondaryBg: string;
  buttonDestructiveBg: string;
  labelRadius: string;
  labelPadding: string;
  buttonTextSize: string;
  menuTextSize: string;
}

interface ThemeSettingsResponse {
  id?: number;
  organizationId?: number;
  lightTheme?: ThemeColors;
  darkTheme?: ThemeColors;
  brandSettings?: BrandSettings;
  layoutSettings?: LayoutSettings;
  activeTheme?: string;
  createdAt?: string;
  updatedAt?: string;
}

const availableFonts = [
  'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Trebuchet MS', 'Palatino', 'Garamond',
  'Bookman', 'Comic Sans MS', 'Impact', 'Lucida Console', 'Tahoma',
  'Geneva', 'Century Gothic', 'Franklin Gothic Medium', 'Calibri',
  'Cambria', 'Segoe UI', 'Open Sans', 'Roboto', 'Lato', 'Montserrat',
  'Poppins', 'Playfair Display', 'Raleway', 'Source Sans Pro', 'Ubuntu'
];

const defaultLightTheme: ThemeColors = {
  primary: '#00BFA6',
  secondary: '#27AE60',
  accent: '#F5F5F5',
  background: '#FAFAFA',
  foreground: '#2F2F2F',
  card: '#FFFFFF',
  cardForeground: '#2F2F2F',
  sidebar: '#F5F5F5',
  sidebarForeground: '#2F2F2F',
  muted: '#F5F5F5',
  mutedForeground: '#666666',
  destructive: '#EF4444',
  success: '#27AE60',
  warning: '#F59E0B',
  border: '#E0E0E0',
  ring: '#00BFA6',
  radius: '8',
  notificationBg: '#1A1A1A',
  notificationFg: '#FFFFFF'
};

const defaultDarkTheme: ThemeColors = {
  primary: '#00BFA6',
  secondary: '#27AE60',
  accent: '#242424',
  background: '#1A1A1A',
  foreground: '#FFFFFF',
  card: '#1A1A1A',
  cardForeground: '#FFFFFF',
  sidebar: '#2F2F2F',
  sidebarForeground: '#FFFFFF',
  muted: '#242424',
  mutedForeground: '#B0B0B0',
  destructive: '#EF4444',
  success: '#27AE60',
  warning: '#F59E0B',
  border: '#2F2F2F',
  ring: '#00BFA6',
  radius: '8',
  notificationBg: '#00BFA6',
  notificationFg: '#FFFFFF'
};

const presetThemes = [
  { name: 'Aimee Default', light: defaultLightTheme, dark: defaultDarkTheme },
  { 
    name: 'Ocean Blue', 
    light: { ...defaultLightTheme, primary: '#0077BE', secondary: '#00A8CC', accent: '#E8F4F8', sidebar: '#F0F8FF', sidebarForeground: '#1A5490', notificationBg: '#0077BE' },
    dark: { ...defaultDarkTheme, primary: '#0077BE', secondary: '#00A8CC', accent: '#0D2F3F', sidebar: '#0D2F3F', sidebarForeground: '#A8D8EA', notificationBg: '#0077BE' }
  },
  { 
    name: 'Forest Green', 
    light: { ...defaultLightTheme, primary: '#228B22', secondary: '#32CD32', accent: '#F0FFF0', sidebar: '#F0FFF0', sidebarForeground: '#1A5A1A', notificationBg: '#228B22' },
    dark: { ...defaultDarkTheme, primary: '#228B22', secondary: '#32CD32', accent: '#0F1F0F', sidebar: '#0F1F0F', sidebarForeground: '#90EE90', notificationBg: '#228B22' }
  },
  { 
    name: 'Sunset Orange', 
    light: { ...defaultLightTheme, primary: '#FF6B35', secondary: '#FF9558', accent: '#FFF5F0', sidebar: '#FFF5F0', sidebarForeground: '#CC4125', notificationBg: '#FF6B35' },
    dark: { ...defaultDarkTheme, primary: '#FF6B35', secondary: '#FF9558', accent: '#1F0F0A', sidebar: '#1F0F0A', sidebarForeground: '#FFB88C', notificationBg: '#FF6B35' }
  },
  { 
    name: 'Royal Purple', 
    light: { ...defaultLightTheme, primary: '#6B46C1', secondary: '#9333EA', accent: '#F3E8FF', sidebar: '#F3E8FF', sidebarForeground: '#4B2882', notificationBg: '#6B46C1' },
    dark: { ...defaultDarkTheme, primary: '#6B46C1', secondary: '#9333EA', accent: '#1A0F2E', sidebar: '#1A0F2E', sidebarForeground: '#C8A8FF', notificationBg: '#6B46C1' }
  }
];

export default function ThemeEditorContent() {
  const { theme: currentTheme, setTheme, reloadTheme } = useTheme();
  const [lightColors, setLightColors] = useState<ThemeColors>(defaultLightTheme);
  const [darkColors, setDarkColors] = useState<ThemeColors>(defaultDarkTheme);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    companyName: 'aimee.works',
    tagline: 'Unify Your Business Management',
    logoUrl: '',
    favicon: '',
    primaryFont: 'Inter',
    headingFont: 'Inter'
  });
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    fontSize: '11',
    fontScale: '1',
    spacing: '1',
    verticalSpacing: '1',
    contentWidth: '1000',
    sidebarWidth: '256',
    h1Size: '18',
    h2Size: '14',
    h3Size: '13',
    h4Size: '12',
    h5Size: '11',
    h6Size: '10',
    smallSize: '10',
    tinySize: '9',
    buttonSmallSize: '8',
    buttonDefaultSize: '10',
    buttonLargeSize: '12',
    buttonRadius: '4',
    buttonPrimaryBg: '#00BFA6',
    buttonSecondaryBg: '#666666',
    buttonDestructiveBg: '#EF4444',
    labelRadius: '999',
    labelPadding: '4',
    buttonTextSize: '9',
    menuTextSize: '9'
  });
  
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['colors']);
  
  // Load theme settings from database
  const { data: dbSettings, isLoading: loadingSettings } = useQuery<ThemeSettingsResponse>({
    queryKey: ['/api/auth/theme-settings']
  });
  
  // Mutation for saving theme settings to database
  const saveThemeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/auth/theme-settings', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Theme settings saved globally across the platform",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/theme-settings'] });
      
      // Reload theme in ThemeContext to apply changes immediately
      await reloadTheme();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save theme settings",
        variant: "destructive"
      });
      console.error('Save error:', error);
    }
  });

  // Load saved settings from database on mount
  useEffect(() => {
    if (dbSettings && !loadingSettings) {
      if (dbSettings.lightTheme) setLightColors(dbSettings.lightTheme);
      if (dbSettings.darkTheme) setDarkColors(dbSettings.darkTheme);
      if (dbSettings.brandSettings) setBrandSettings(dbSettings.brandSettings);
      
      // Use database layout settings if available, otherwise keep default "Aimee Default" values
      // This ensures the theme editor shows the current CSS values when no custom settings exist
      if (dbSettings.layoutSettings) {
        setLayoutSettings(dbSettings.layoutSettings);
      }
      // Note: If no dbSettings.layoutSettings, we keep the default values that match the current CSS
      
      if (dbSettings.activeTheme) setTheme(dbSettings.activeTheme as "light" | "dark");
      
      // Apply settings immediately after loading from database
      setTimeout(() => {
        if (dbSettings.layoutSettings) applyLayoutSettings(dbSettings.layoutSettings);
        if (dbSettings.activeTheme === 'dark' && dbSettings.darkTheme) {
          applyColors(dbSettings.darkTheme);
        } else if (dbSettings.lightTheme) {
          applyColors(dbSettings.lightTheme);
        }
      }, 100);
    }
  }, [dbSettings, loadingSettings]);

  const hexToHSL = (hex: string) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string, isDark: boolean) => {
    if (isDark) {
      setDarkColors(prev => ({ ...prev, [colorKey]: value }));
    } else {
      setLightColors(prev => ({ ...prev, [colorKey]: value }));
    }
  };

  const applyColors = (colors: ThemeColors) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      if (key === 'radius') {
        root.style.setProperty('--radius', `${value}px`);
      } else if (key === 'notificationBg') {
        root.style.setProperty('--notification-bg', value.startsWith('#') ? hexToHSL(value) : value);
      } else if (key === 'notificationFg') {
        root.style.setProperty('--notification-fg', value.startsWith('#') ? hexToHSL(value) : value);
      } else if (value.startsWith('#')) {
        const hslValue = hexToHSL(value);
        root.style.setProperty(`--${key}`, hslValue);
      } else {
        root.style.setProperty(`--${key}`, value);
      }
    });
  };
  
  const applyLayoutSettings = (settings: LayoutSettings) => {
    const root = document.documentElement;
    const ptsToPixels = (pts: string) => Math.round(parseFloat(pts) * 1.333);
    
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--font-scale', settings.fontScale);
    root.style.setProperty('--spacing-scale', settings.spacing);
    root.style.setProperty('--vertical-spacing-scale', settings.verticalSpacing);
    root.style.setProperty('--max-content-width', `${settings.contentWidth}px`);
    root.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`);
    
    // Apply heading sizes
    root.style.setProperty('--h1-size', `${ptsToPixels(settings.h1Size)}px`);
    root.style.setProperty('--h2-size', `${ptsToPixels(settings.h2Size)}px`);
    root.style.setProperty('--h3-size', `${ptsToPixels(settings.h3Size)}px`);
    root.style.setProperty('--h4-size', `${ptsToPixels(settings.h4Size)}px`);
    root.style.setProperty('--h5-size', `${ptsToPixels(settings.h5Size)}px`);
    root.style.setProperty('--h6-size', `${ptsToPixels(settings.h6Size)}px`);
    root.style.setProperty('--small-size', `${ptsToPixels(settings.smallSize)}px`);
    root.style.setProperty('--tiny-size', `${ptsToPixels(settings.tinySize)}px`);
    
    // Apply button settings
    root.style.setProperty('--button-small-padding', `${settings.buttonSmallSize}px`);
    root.style.setProperty('--button-default-padding', `${settings.buttonDefaultSize}px`);
    root.style.setProperty('--button-large-padding', `${settings.buttonLargeSize}px`);
    root.style.setProperty('--button-radius', `${settings.buttonRadius}px`);
    
    // Apply menu text size
    root.style.setProperty('--menu-text-size', `${ptsToPixels(settings.menuTextSize)}px`);
    
    // Apply fonts
    root.style.setProperty('--primary-font', brandSettings.primaryFont);
    root.style.setProperty('--heading-font', brandSettings.headingFont);
  };

  const applyTheme = () => {
    const colors = currentTheme === 'dark' ? darkColors : lightColors;
    
    applyColors(colors);
    applyLayoutSettings(layoutSettings);
    
    const themeData = {
      lightTheme: lightColors,
      darkTheme: darkColors,
      brandSettings: brandSettings,
      layoutSettings: layoutSettings,
      activeTheme: currentTheme
    };
    
    saveThemeMutation.mutate(themeData);
    
    // Cache in localStorage for instant loading on refresh
    localStorage.setItem('cachedThemeSettings', JSON.stringify(themeData));
    localStorage.setItem('customLightTheme', JSON.stringify(lightColors));
    localStorage.setItem('customDarkTheme', JSON.stringify(darkColors));
    localStorage.setItem('brandSettings', JSON.stringify(brandSettings));
    localStorage.setItem('layoutSettings', JSON.stringify(layoutSettings));
  };

  const resetTheme = () => {
    const defaultBrand = {
      companyName: 'aimee.works',
      tagline: 'Unify Your Business Management',
      logoUrl: '',
      favicon: '',
      primaryFont: 'Inter',
      headingFont: 'Inter'
    };
    
    const defaultLayout = {
      fontSize: '16',
      fontScale: '1',
      spacing: '1',
      verticalSpacing: '1',
      contentWidth: '1200',
      sidebarWidth: '256',
      h1Size: '40',
      h2Size: '32',
      h3Size: '28',
      h4Size: '24',
      h5Size: '20',
      h6Size: '18',
      smallSize: '14',
      tinySize: '12',
      buttonSmallSize: '8',
      buttonDefaultSize: '10',
      buttonLargeSize: '12',
      buttonRadius: '6',
      buttonPrimaryBg: '#00BFA6',
      buttonSecondaryBg: '#666666',
      buttonDestructiveBg: '#EF4444',
      labelRadius: '999',
      labelPadding: '4',
      buttonTextSize: '14',
      menuTextSize: '14'
    };
    
    setLightColors(defaultLightTheme);
    setDarkColors(defaultDarkTheme);
    setBrandSettings(defaultBrand);
    setLayoutSettings(defaultLayout);
    
    const colors = currentTheme === 'dark' ? defaultDarkTheme : defaultLightTheme;
    applyColors(colors);
    applyLayoutSettings(defaultLayout);
    
    const defaultThemeData = {
      lightTheme: defaultLightTheme,
      darkTheme: defaultDarkTheme,
      brandSettings: defaultBrand,
      layoutSettings: defaultLayout,
      activeTheme: currentTheme
    };
    
    saveThemeMutation.mutate(defaultThemeData);
    
    localStorage.setItem('cachedThemeSettings', JSON.stringify(defaultThemeData));
    localStorage.removeItem('customLightTheme');
    localStorage.removeItem('customDarkTheme');
    localStorage.removeItem('brandSettings');
    localStorage.removeItem('layoutSettings');
  };

  const loadPreset = (preset: typeof presetThemes[0]) => {
    setLightColors(preset.light);
    setDarkColors(preset.dark);
    toast({
      title: "Preset Loaded",
      description: `${preset.name} theme has been loaded.`,
    });
  };

  const exportTheme = () => {
    const themeData = {
      light: lightColors,
      dark: darkColors,
      brand: brandSettings,
      layout: layoutSettings
    };
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.light) setLightColors(data.light);
          if (data.dark) setDarkColors(data.dark);
          if (data.brand) setBrandSettings(data.brand);
          if (data.layout) setLayoutSettings(data.layout);
          toast({
            title: "Theme Imported",
            description: "Theme configuration has been imported successfully.",
          });
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "Invalid theme configuration file.",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const colors = currentTheme === 'dark' ? darkColors : lightColors;

  const ColorInput = ({ colorKey, label }: { colorKey: keyof ThemeColors; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={colors[colorKey]}
          onChange={(e) => handleColorChange(colorKey, e.target.value, currentTheme === 'dark')}
          className="w-20 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={colors[colorKey]}
          onChange={(e) => handleColorChange(colorKey, e.target.value, currentTheme === 'dark')}
          className="flex-1"
        />
        <Button 
          size="icon" 
          variant="outline"
          onClick={() => copyColor(colors[colorKey])}
        >
          {copiedColor === colors[colorKey] ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-4 h-full overflow-y-auto">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={resetTheme}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={applyTheme} size="sm">
            Apply Theme
          </Button>
        </div>
      </div>

      {/* Theme Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sun className="h-5 w-5" />
              <span className="font-medium">Light</span>
            </div>
            <Switch
              checked={currentTheme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <div className="flex items-center gap-4">
              <span className="font-medium">Dark</span>
              <Moon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="tracking-tight text-[16px] font-medium mt-[0px] mb-[0px]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Preset Themes</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {presetThemes.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                  className="text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportTheme}>
              <Download className="h-4 w-4 mr-2" />
              Export Theme
            </Button>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
                id="import-theme"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-theme')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Theme
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Collapsible open={openSections.includes('colors')}>
        <Card>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleSection('colors')}
          >
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  <CardTitle className="font-semibold tracking-tight text-[18px] mt-[0px] mb-[0px]">Colors</CardTitle>
                </div>
                {openSections.includes('colors') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Primary Colors */}
                <div className="space-y-4">
                  <h3 className="font-medium">Primary Colors</h3>
                  <ColorInput colorKey="primary" label="Primary" />
                  <ColorInput colorKey="secondary" label="Secondary" />
                  <ColorInput colorKey="accent" label="Accent" />
                </div>

                {/* Background Colors */}
                <div className="space-y-4">
                  <h3 className="font-medium">Background Colors</h3>
                  <ColorInput colorKey="background" label="Background" />
                  <ColorInput colorKey="sidebar" label="Sidebar" />
                  <ColorInput colorKey="card" label="Card" />
                  <ColorInput colorKey="muted" label="Muted" />
                </div>

                {/* Text Colors */}
                <div className="space-y-4">
                  <h3 className="font-medium">Text Colors</h3>
                  <ColorInput colorKey="foreground" label="Foreground" />
                  <ColorInput colorKey="sidebarForeground" label="Sidebar Text" />
                  <ColorInput colorKey="cardForeground" label="Card Text" />
                  <ColorInput colorKey="mutedForeground" label="Muted Text" />
                </div>

                {/* Status Colors */}
                <div className="space-y-4">
                  <h3 className="font-medium">Status Colors</h3>
                  <ColorInput colorKey="success" label="Success" />
                  <ColorInput colorKey="warning" label="Warning" />
                  <ColorInput colorKey="destructive" label="Destructive" />
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-4">
                <h3 className="font-medium">Border Radius</h3>
                <div className="flex items-center gap-4">
                  <Label>Radius: {colors.radius}px</Label>
                  <Slider
                    value={[parseInt(colors.radius)]}
                    onValueChange={(value) => handleColorChange('radius', value[0].toString(), currentTheme === 'dark')}
                    min={0}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="h-16 w-16 bg-primary" style={{ borderRadius: `${colors.radius}px` }} />
                  <div className="h-16 w-16 bg-secondary" style={{ borderRadius: `${colors.radius}px` }} />
                  <div className="h-16 w-16 bg-accent" style={{ borderRadius: `${colors.radius}px` }} />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Typography Section */}
      <Collapsible open={openSections.includes('typography')}>
        <Card>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleSection('typography')}
          >
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  <CardTitle className="font-semibold tracking-tight text-[18px] mt-[0px] mb-[0px]">Typography</CardTitle>
                </div>
                {openSections.includes('typography') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Font Size (pts)</Label>
                  <Input
                    type="number"
                    value={layoutSettings.fontSize}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                    min={10}
                    max={24}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Global Scale</Label>
                  <Input
                    type="number"
                    value={layoutSettings.fontScale}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, fontScale: e.target.value }))}
                    min={0.5}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Heading Sizes</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((heading) => (
                    <div key={heading} className="space-y-2">
                      <Label>{heading.toUpperCase()} Size</Label>
                      <Input
                        type="number"
                        value={layoutSettings[`${heading}Size` as keyof LayoutSettings]}
                        onChange={(e) => setLayoutSettings(prev => ({ 
                          ...prev, 
                          [`${heading}Size`]: e.target.value 
                        }))}
                        min={12}
                        max={60}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Layout Section */}
      <Collapsible open={openSections.includes('layout')}>
        <Card>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleSection('layout')}
          >
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  <CardTitle className="font-semibold tracking-tight text-[20px] mt-[0px] mb-[0px]">Layout</CardTitle>
                </div>
                {openSections.includes('layout') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content Width (px)</Label>
                  <Input
                    type="number"
                    value={layoutSettings.contentWidth}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, contentWidth: e.target.value }))}
                    min={800}
                    max={1600}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sidebar Width (px)</Label>
                  <Input
                    type="number"
                    value={layoutSettings.sidebarWidth}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, sidebarWidth: e.target.value }))}
                    min={200}
                    max={400}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Spacing Scale</Label>
                  <Input
                    type="number"
                    value={layoutSettings.spacing}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, spacing: e.target.value }))}
                    min={0.5}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Radius (px)</Label>
                  <Input
                    type="number"
                    value={layoutSettings.buttonRadius}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonRadius: e.target.value }))}
                    min={0}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Menu Text Size (pts)</Label>
                  <Input
                    type="number"
                    value={layoutSettings.menuTextSize}
                    onChange={(e) => setLayoutSettings(prev => ({ ...prev, menuTextSize: e.target.value }))}
                    min={10}
                    max={24}
                  />
                  <p className="text-xs text-muted-foreground">Controls sidebar menu section headings font size</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Menu Text Size Preview</h3>
                <div className="p-3 border rounded-md bg-muted/50">
                  <div 
                    className="text-sm font-medium text-foreground"
                    style={{ fontSize: `${Math.round(parseFloat(layoutSettings.menuTextSize) * 1.333)}px` }}
                  >
                    Dev Tools
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current size: {layoutSettings.menuTextSize}pt ({Math.round(parseFloat(layoutSettings.menuTextSize) * 1.333)}px)
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Branding Section */}
      <Collapsible open={openSections.includes('branding')}>
        <Card>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleSection('branding')}
          >
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <CardTitle className="font-semibold tracking-tight text-[18px] mt-[0px] mb-[0px]">Branding</CardTitle>
                </div>
                {openSections.includes('branding') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={brandSettings.companyName}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={brandSettings.tagline}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, tagline: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Font</Label>
                  <Select
                    value={brandSettings.primaryFont}
                    onValueChange={(value) => setBrandSettings(prev => ({ ...prev, primaryFont: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFonts.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Heading Font</Label>
                  <Select
                    value={brandSettings.headingFont}
                    onValueChange={(value) => setBrandSettings(prev => ({ ...prev, headingFont: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFonts.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}