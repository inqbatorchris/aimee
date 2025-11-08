import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Palette, 
  Download, 
  Upload, 
  RotateCcw,
  Eye,
  Sun,
  Moon,
  Copy,
  Check
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

const availableFonts = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Palatino',
  'Garamond',
  'Bookman',
  'Comic Sans MS',
  'Impact',
  'Lucida Console',
  'Tahoma',
  'Geneva',
  'Century Gothic',
  'Franklin Gothic Medium',
  'Calibri',
  'Cambria',
  'Segoe UI',
  'Open Sans',
  'Roboto',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Raleway',
  'Source Sans Pro',
  'Ubuntu'
];

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

const defaultLightTheme: ThemeColors = {
  primary: '#00BFA6',
  secondary: '#27AE60',
  accent: '#F5F5F5',
  background: '#FAFAFA',
  foreground: '#2F2F2F',
  card: '#FFFFFF',
  cardForeground: '#2F2F2F',
  sidebar: '#FFFFFF',
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
  accent: '#1F1F1F',
  background: '#0A0A0A',
  foreground: '#FFFFFF',
  card: '#1A1A1A',
  cardForeground: '#FFFFFF',
  sidebar: '#1A1A1A',
  sidebarForeground: '#FFFFFF',
  muted: '#2A2A2A',
  mutedForeground: '#A0A0A0',
  destructive: '#EF4444',
  success: '#27AE60',
  warning: '#F59E0B',
  border: '#2A2A2A',
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

export default function ThemeEditor() {
  const { theme: currentTheme, setTheme } = useTheme();
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
  });
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  
  // Load theme settings from database
  const { data: dbSettings, isLoading: loadingSettings } = useQuery<ThemeSettingsResponse>({
    queryKey: ['/api/auth/theme-settings']
  });
  
  // Mutation for saving theme settings to database
  const saveThemeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/auth/theme-settings', {
        method: 'POST',
        body: data  // apiRequest already handles JSON.stringify internally
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Theme settings saved globally across the platform",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/theme-settings'] });
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
      // Load settings from database if available
      if (dbSettings.lightTheme) {
        setLightColors(dbSettings.lightTheme);
      }
      if (dbSettings.darkTheme) {
        setDarkColors(dbSettings.darkTheme);
      }
      if (dbSettings.brandSettings) {
        setBrandSettings(dbSettings.brandSettings);
      }
      if (dbSettings.layoutSettings) {
        setLayoutSettings(dbSettings.layoutSettings);
      }
      if (dbSettings.activeTheme) {
        setTheme(dbSettings.activeTheme as "light" | "dark");
      }
      
      // Apply settings immediately after loading from database
      setTimeout(() => {
        if (dbSettings.layoutSettings) {
          applyLayoutSettings(dbSettings.layoutSettings);
        }
        if (dbSettings.activeTheme === 'dark' && dbSettings.darkTheme) {
          applyColors(dbSettings.darkTheme);
        } else if (dbSettings.lightTheme) {
          applyColors(dbSettings.lightTheme);
        }
      }, 100);
    } else if (!loadingSettings) {
      // Fall back to localStorage only if no database settings exist
      const savedLightTheme = localStorage.getItem('customLightTheme');
      const savedDarkTheme = localStorage.getItem('customDarkTheme');
      const savedBrandSettings = localStorage.getItem('brandSettings');
      const savedLayoutSettings = localStorage.getItem('layoutSettings');
      
      if (savedLightTheme) {
        try {
          setLightColors(JSON.parse(savedLightTheme));
        } catch (e) {
          console.error('Failed to load light theme:', e);
        }
      }
      
      if (savedDarkTheme) {
        try {
          setDarkColors(JSON.parse(savedDarkTheme));
        } catch (e) {
          console.error('Failed to load dark theme:', e);
        }
      }
      
      if (savedBrandSettings) {
        try {
          setBrandSettings(JSON.parse(savedBrandSettings));
        } catch (e) {
          console.error('Failed to load brand settings:', e);
        }
      }
      
      if (savedLayoutSettings) {
        try {
          setLayoutSettings(JSON.parse(savedLayoutSettings));
        } catch (e) {
          console.error('Failed to load layout settings:', e);
        }
      }
      
      // Apply settings immediately after loading
      setTimeout(() => {
        applyLoadedSettings();
      }, 100);
    }
  }, [dbSettings, loadingSettings]);
  
  // Helper function to validate color values
  const isValidColor = (color: string): boolean => {
    // Check if it's a valid hex color
    if (color.match(/^#[0-9A-F]{6}$/i)) return true;
    // Check if it's a valid RGB/HSL format
    if (color.match(/^\d+(\s+\d+%?){2}$/)) return true;
    return false;
  };

  useEffect(() => {
    // Load saved theme from localStorage
    const savedLightTheme = localStorage.getItem('customLightTheme');
    const savedDarkTheme = localStorage.getItem('customDarkTheme');
    const savedBrand = localStorage.getItem('brandSettings');
    
    if (savedLightTheme) {
      try {
        const parsed = JSON.parse(savedLightTheme);
        setLightColors(parsed);
      } catch (e) {
        console.error('Invalid saved light theme, using defaults');
        setLightColors(defaultLightTheme);
      }
    }
    
    if (savedDarkTheme) {
      try {
        const parsed = JSON.parse(savedDarkTheme);
        setDarkColors(parsed);
      } catch (e) {
        console.error('Invalid saved dark theme, using defaults');
        setDarkColors(defaultDarkTheme);
      }
    }
    
    if (savedBrand) {
      try {
        setBrandSettings(JSON.parse(savedBrand));
      } catch (e) {
        console.error('Invalid saved brand settings');
      }
    }
    
    // Apply current theme on mount - with validation
    const colors = currentTheme === 'dark' ? 
      (savedDarkTheme ? JSON.parse(savedDarkTheme) : defaultDarkTheme) : 
      (savedLightTheme ? JSON.parse(savedLightTheme) : defaultLightTheme);
    
    // Validate colors and reset if any are invalid
    let needsReset = false;
    for (const [key, value] of Object.entries(colors)) {
      if (key !== 'radius' && !isValidColor(value as string)) {
        console.error(`Invalid color detected for ${key}: ${value}. Resetting theme.`);
        needsReset = true;
        break;
      }
    }
    
    if (needsReset) {
      // Reset to defaults if invalid colors detected
      const defaultColors = currentTheme === 'dark' ? defaultDarkTheme : defaultLightTheme;
      if (currentTheme === 'dark') {
        setDarkColors(defaultDarkTheme);
      } else {
        setLightColors(defaultLightTheme);
      }
      
      // Apply defaults
      const root = document.documentElement;
      Object.entries(defaultColors).forEach(([key, value]) => {
        if (key === 'radius') {
          root.style.setProperty('--radius', `${value}px`);
        } else if (typeof value === 'string' && value.startsWith('#')) {
          const hslValue = hexToHSL(value);
          root.style.setProperty(`--${key}`, hslValue);
        }
      });
      
      // Clear invalid saved themes
      localStorage.removeItem('customLightTheme');
      localStorage.removeItem('customDarkTheme');
      
      toast({
        title: "Theme Reset",
        description: "Invalid theme detected and reset to defaults.",
        variant: "destructive"
      });
    } else {
      // Apply valid theme
      const root = document.documentElement;
      Object.entries(colors).forEach(([key, value]) => {
        if (key === 'radius') {
          root.style.setProperty('--radius', `${value}px`);
        } else if (typeof value === 'string' && value.startsWith('#')) {
          const hslValue = hexToHSL(value);
          root.style.setProperty(`--${key}`, hslValue);
        }
      });
    }
  }, [currentTheme]);

  const handleColorChange = (colorKey: keyof ThemeColors, value: string, isDark: boolean) => {
    if (isDark) {
      setDarkColors(prev => ({ ...prev, [colorKey]: value }));
    } else {
      setLightColors(prev => ({ ...prev, [colorKey]: value }));
    }
  };

  const hexToHSL = (hex: string) => {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
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
  
  // Helper function to apply colors
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
  
  // Helper function to apply layout settings
  const applyLayoutSettings = (settings: LayoutSettings) => {
    const root = document.documentElement;
    const ptsToPixels = (pts: string) => Math.round(parseFloat(pts) * 1.333);
    
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--font-scale', settings.fontScale);
    root.style.setProperty('--spacing-scale', settings.spacing);
    root.style.setProperty('--vertical-spacing-scale', settings.verticalSpacing);
    root.style.setProperty('--max-content-width', `${settings.contentWidth}px`);
    root.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`);
    
    // Apply individual heading sizes (converted from pts to px)
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
    root.style.setProperty('--button-primary-bg', settings.buttonPrimaryBg);
    root.style.setProperty('--button-secondary-bg', settings.buttonSecondaryBg);
    root.style.setProperty('--button-destructive-bg', settings.buttonDestructiveBg);
    
    // Apply label/badge settings
    root.style.setProperty('--label-radius', `${settings.labelRadius}px`);
    root.style.setProperty('--label-padding', `${settings.labelPadding}px`);
    
    // Apply text size settings
    root.style.setProperty('--button-text-size', `${ptsToPixels(settings.buttonTextSize)}px`);
    root.style.setProperty('--menu-text-size', `${ptsToPixels(settings.menuTextSize)}px`);
    
    // Apply brand settings
    root.style.setProperty('--primary-font', brandSettings.primaryFont);
    root.style.setProperty('--heading-font', brandSettings.headingFont);
  };

  const applyTheme = () => {
    const colors = currentTheme === 'dark' ? darkColors : lightColors;
    
    // Apply colors and layout settings
    applyColors(colors);
    applyLayoutSettings(layoutSettings);
    
    // Prepare theme data
    const themeData = {
      lightTheme: lightColors,
      darkTheme: darkColors,
      brandSettings: brandSettings,
      layoutSettings: layoutSettings,
      activeTheme: currentTheme
    };
    
    // Save to database
    saveThemeMutation.mutate(themeData);
    
    // Cache in localStorage for instant loading on refresh
    localStorage.setItem('cachedThemeSettings', JSON.stringify(themeData));
    
    // Also save individual pieces for backward compatibility
    localStorage.setItem('customLightTheme', JSON.stringify(lightColors));
    localStorage.setItem('customDarkTheme', JSON.stringify(darkColors));
    localStorage.setItem('brandSettings', JSON.stringify(brandSettings));
    localStorage.setItem('layoutSettings', JSON.stringify(layoutSettings));
  };

  // Apply loaded settings function
  const applyLoadedSettings = () => {
    const colors = currentTheme === 'dark' ? darkColors : lightColors;
    const root = document.documentElement;
    
    // Apply all settings without showing a toast
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
    
    // Convert pts to px (1pt = 1.333px)
    const ptsToPixels = (pts: string) => Math.round(parseFloat(pts) * 1.333);
    
    // Apply all layout settings
    root.style.setProperty('--base-font-size', `${layoutSettings.fontSize}px`);
    root.style.setProperty('--font-scale', layoutSettings.fontScale);
    root.style.setProperty('--spacing-scale', layoutSettings.spacing);
    root.style.setProperty('--vertical-spacing-scale', layoutSettings.verticalSpacing);
    root.style.setProperty('--h1-size', `${ptsToPixels(layoutSettings.h1Size)}px`);
    root.style.setProperty('--h2-size', `${ptsToPixels(layoutSettings.h2Size)}px`);
    root.style.setProperty('--h3-size', `${ptsToPixels(layoutSettings.h3Size)}px`);
    root.style.setProperty('--h4-size', `${ptsToPixels(layoutSettings.h4Size)}px`);
    root.style.setProperty('--h5-size', `${ptsToPixels(layoutSettings.h5Size)}px`);
    root.style.setProperty('--h6-size', `${ptsToPixels(layoutSettings.h6Size)}px`);
    root.style.setProperty('--small-size', `${ptsToPixels(layoutSettings.smallSize)}px`);
    root.style.setProperty('--tiny-size', `${ptsToPixels(layoutSettings.tinySize)}px`);
    
    // Apply button settings
    root.style.setProperty('--button-small-padding', `${layoutSettings.buttonSmallSize}px`);
    root.style.setProperty('--button-default-padding', `${layoutSettings.buttonDefaultSize}px`);
    root.style.setProperty('--button-large-padding', `${layoutSettings.buttonLargeSize}px`);
    root.style.setProperty('--button-radius', `${layoutSettings.buttonRadius}px`);
    root.style.setProperty('--button-primary-bg', layoutSettings.buttonPrimaryBg);
    root.style.setProperty('--button-secondary-bg', layoutSettings.buttonSecondaryBg);
    root.style.setProperty('--button-destructive-bg', layoutSettings.buttonDestructiveBg);
    
    // Apply label/badge settings
    root.style.setProperty('--label-radius', `${layoutSettings.labelRadius}px`);
    root.style.setProperty('--label-padding', `${layoutSettings.labelPadding}px`);
    
    // Apply text size settings
    root.style.setProperty('--button-text-size', `${ptsToPixels(layoutSettings.buttonTextSize)}px`);
    root.style.setProperty('--menu-text-size', `${ptsToPixels(layoutSettings.menuTextSize)}px`);
    
    root.style.setProperty('--primary-font', brandSettings.primaryFont || 'Inter');
    root.style.setProperty('--heading-font', brandSettings.headingFont || 'Inter');
  };

  const resetTheme = () => {
    // Reset to default values
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
    
    // Apply default theme immediately
    const colors = currentTheme === 'dark' ? defaultDarkTheme : defaultLightTheme;
    applyColors(colors);
    applyLayoutSettings(defaultLayout);
    
    // Prepare default theme data
    const defaultThemeData = {
      lightTheme: defaultLightTheme,
      darkTheme: defaultDarkTheme,
      brandSettings: defaultBrand,
      layoutSettings: defaultLayout,
      activeTheme: currentTheme
    };
    
    // Save to database
    saveThemeMutation.mutate(defaultThemeData);
    
    // Update cached settings
    localStorage.setItem('cachedThemeSettings', JSON.stringify(defaultThemeData));
    
    // Clear old localStorage items
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
      brand: brandSettings
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

  const colors = currentTheme === 'dark' ? darkColors : lightColors;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Palette className="h-6 sm:h-8 w-6 sm:w-8" />
            Theme Editor
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Customize your platform's look and feel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)} className="flex-1 sm:flex-none">
            <Eye className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{previewMode ? 'Exit Preview' : 'Preview'}</span>
            <span className="sm:hidden">{previewMode ? 'Exit' : 'Preview'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={resetTheme} className="flex-1 sm:flex-none">
            <RotateCcw className="h-4 w-4 mr-1 sm:mr-2" />
            Reset
          </Button>
          <Button onClick={applyTheme} size="sm" className="flex-1 sm:flex-none">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Desktop tabs */}
        <TabsList className="hidden sm:grid w-full grid-cols-5">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="brand">Branding</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="export">Export/Import</TabsTrigger>
        </TabsList>
        
        {/* Mobile dropdown */}
        <div className="sm:hidden">
          <Select
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="colors">Colors</SelectItem>
              <SelectItem value="layout">Layout</SelectItem>
              <SelectItem value="brand">Branding</SelectItem>
              <SelectItem value="presets">Presets</SelectItem>
              <SelectItem value="export">Export/Import</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="colors" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Colors</CardTitle>
                <CardDescription className="text-base">Main brand and action colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['primary', 'secondary', 'accent'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="w-20 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyColor(colors[key as keyof ThemeColors])}
                      >
                        {copiedColor === colors[key as keyof ThemeColors] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Background Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Background Colors</CardTitle>
                <CardDescription className="text-base">Page, sidebar and component backgrounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['background', 'sidebar', 'card', 'muted'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="w-20 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyColor(colors[key as keyof ThemeColors])}
                      >
                        {copiedColor === colors[key as keyof ThemeColors] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Text Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Text Colors</CardTitle>
                <CardDescription className="text-base">Foreground and text colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['foreground', 'sidebarForeground', 'cardForeground', 'mutedForeground'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="w-20 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyColor(colors[key as keyof ThemeColors])}
                      >
                        {copiedColor === colors[key as keyof ThemeColors] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Status Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Status Colors</CardTitle>
                <CardDescription>Success, warning, and error states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['success', 'warning', 'destructive'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="w-20 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyColor(colors[key as keyof ThemeColors])}
                      >
                        {copiedColor === colors[key as keyof ThemeColors] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Notification Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Colors</CardTitle>
                <CardDescription className="text-base">Toast notification appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['notificationBg', 'notificationFg'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label>{key === 'notificationBg' ? 'Background' : 'Text'}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="w-20 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={colors[key as keyof ThemeColors]}
                        onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value, currentTheme === 'dark')}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyColor(colors[key as keyof ThemeColors])}
                      >
                        {copiedColor === colors[key as keyof ThemeColors] ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 rounded-md" style={{ 
                  backgroundColor: colors.notificationBg, 
                  color: colors.notificationFg,
                  border: '1px solid ' + colors.border 
                }}>
                  <p className="text-sm">Preview: This is how your notifications will look</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Border Radius */}
          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
              <CardDescription className="text-base">Corner roundness for components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Font Size Settings */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription className="text-base">Control font sizes and scaling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Font Size (pts)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.fontSize}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                        min={10}
                        max={24}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Global Scale</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.fontScale}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, fontScale: e.target.value }))}
                        min={0.5}
                        max={2}
                        step={0.1}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Heading Sizes</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>H1 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h1Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h1Size: e.target.value }))}
                          min={24}
                          max={60}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>H2 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h2Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h2Size: e.target.value }))}
                          min={20}
                          max={48}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>H3 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h3Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h3Size: e.target.value }))}
                          min={18}
                          max={40}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>H4 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h4Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h4Size: e.target.value }))}
                          min={16}
                          max={32}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>H5 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h5Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h5Size: e.target.value }))}
                          min={14}
                          max={24}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>H6 Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.h6Size}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, h6Size: e.target.value }))}
                          min={12}
                          max={20}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Text Sizes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Small Text</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.smallSize}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, smallSize: e.target.value }))}
                          min={10}
                          max={16}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tiny Text</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.tinySize}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, tinySize: e.target.value }))}
                          min={8}
                          max={14}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spacing Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Spacing</CardTitle>
                <CardDescription className="text-base">Control padding and margins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Horizontal Spacing Scale</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={layoutSettings.spacing}
                      onChange={(e) => setLayoutSettings(prev => ({ ...prev, spacing: e.target.value }))}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">x</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vertical Spacing Scale</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={layoutSettings.verticalSpacing}
                      onChange={(e) => setLayoutSettings(prev => ({ ...prev, verticalSpacing: e.target.value }))}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">x</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Layout</CardTitle>
                <CardDescription className="text-base">Control page layout dimensions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Content Width: {layoutSettings.contentWidth}px</Label>
                  <Slider
                    value={[parseInt(layoutSettings.contentWidth)]}
                    onValueChange={(value) => setLayoutSettings(prev => ({ ...prev, contentWidth: value[0].toString() }))}
                    min={800}
                    max={1600}
                    step={50}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sidebar Width: {layoutSettings.sidebarWidth}px</Label>
                  <Slider
                    value={[parseInt(layoutSettings.sidebarWidth)]}
                    onValueChange={(value) => setLayoutSettings(prev => ({ ...prev, sidebarWidth: value[0].toString() }))}
                    min={200}
                    max={350}
                    step={10}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Button Customization */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Button Customization</CardTitle>
                <CardDescription className="text-base">Control button sizes, colors and rounding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Small Button Padding</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.buttonSmallSize}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonSmallSize: e.target.value }))}
                        min={4}
                        max={12}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Button Padding</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.buttonDefaultSize}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonDefaultSize: e.target.value }))}
                        min={6}
                        max={16}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Large Button Padding</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.buttonLargeSize}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonLargeSize: e.target.value }))}
                        min={8}
                        max={20}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Button Colors</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Button</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={layoutSettings.buttonPrimaryBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonPrimaryBg: e.target.value }))}
                          className="w-20 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={layoutSettings.buttonPrimaryBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonPrimaryBg: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Button</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={layoutSettings.buttonSecondaryBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonSecondaryBg: e.target.value }))}
                          className="w-20 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={layoutSettings.buttonSecondaryBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonSecondaryBg: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Destructive Button</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={layoutSettings.buttonDestructiveBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonDestructiveBg: e.target.value }))}
                          className="w-20 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={layoutSettings.buttonDestructiveBg}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonDestructiveBg: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Button Style</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Button Border Radius</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.buttonRadius}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonRadius: e.target.value }))}
                          min={0}
                          max={50}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Button Text Size</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={layoutSettings.buttonTextSize}
                          onChange={(e) => setLayoutSettings(prev => ({ ...prev, buttonTextSize: e.target.value }))}
                          min={10}
                          max={20}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" style={{ 
                      padding: `${layoutSettings.buttonSmallSize}px ${parseInt(layoutSettings.buttonSmallSize) * 2}px`,
                      borderRadius: `${layoutSettings.buttonRadius}px`,
                      backgroundColor: layoutSettings.buttonPrimaryBg,
                      fontSize: `${Math.round(parseFloat(layoutSettings.buttonTextSize) * 1.333)}px`
                    }}>
                      Small
                    </Button>
                    <Button size="default" style={{ 
                      padding: `${layoutSettings.buttonDefaultSize}px ${parseInt(layoutSettings.buttonDefaultSize) * 2}px`,
                      borderRadius: `${layoutSettings.buttonRadius}px`,
                      backgroundColor: layoutSettings.buttonPrimaryBg,
                      fontSize: `${Math.round(parseFloat(layoutSettings.buttonTextSize) * 1.333)}px`
                    }}>
                      Default
                    </Button>
                    <Button size="lg" style={{ 
                      padding: `${layoutSettings.buttonLargeSize}px ${parseInt(layoutSettings.buttonLargeSize) * 2}px`,
                      borderRadius: `${layoutSettings.buttonRadius}px`,
                      backgroundColor: layoutSettings.buttonPrimaryBg,
                      fontSize: `${Math.round(parseFloat(layoutSettings.buttonTextSize) * 1.333)}px`
                    }}>
                      Large
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Menu & Navigation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Menu & Navigation</CardTitle>
                <CardDescription className="text-base">Control sidebar and navigation text sizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sidebar & Navigation Text Size</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={layoutSettings.menuTextSize}
                      onChange={(e) => setLayoutSettings(prev => ({ ...prev, menuTextSize: e.target.value }))}
                      min={10}
                      max={20}
                      className="w-20"
                    />
                    <span className="text-base text-muted-foreground">pts</span>
                  </div>
                </div>
                <div className="text-base text-muted-foreground">
                  This controls the text size in the sidebar menu (My Day, Strategy & OKRs, etc.), dropdown menus, and all navigation items
                </div>
              </CardContent>
            </Card>
            
            {/* Label/Badge Styling */}
            <Card>
              <CardHeader>
                <CardTitle>Label & Badge Styling</CardTitle>
                <CardDescription className="text-base">Configure pill-shaped labels and badges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Label Border Radius</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.labelRadius}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, labelRadius: e.target.value }))}
                        min={0}
                        max={999}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Label Padding</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={layoutSettings.labelPadding}
                        onChange={(e) => setLayoutSettings(prev => ({ ...prev, labelPadding: e.target.value }))}
                        min={2}
                        max={12}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap mt-4">
                  <span 
                    className="inline-flex items-center text-xs font-medium" 
                    style={{ 
                      padding: `${layoutSettings.labelPadding}px ${parseInt(layoutSettings.labelPadding) * 2.5}px`,
                      borderRadius: `${layoutSettings.labelRadius}px`,
                      backgroundColor: lightColors.primary,
                      color: 'white'
                    }}
                  >
                    Primary Label
                  </span>
                  <span 
                    className="inline-flex items-center text-xs font-medium" 
                    style={{ 
                      padding: `${layoutSettings.labelPadding}px ${parseInt(layoutSettings.labelPadding) * 2.5}px`,
                      borderRadius: `${layoutSettings.labelRadius}px`,
                      backgroundColor: lightColors.success,
                      color: 'white'
                    }}
                  >
                    Success Badge
                  </span>
                  <span 
                    className="inline-flex items-center text-xs font-medium" 
                    style={{ 
                      padding: `${layoutSettings.labelPadding}px ${parseInt(layoutSettings.labelPadding) * 2.5}px`,
                      borderRadius: `${layoutSettings.labelRadius}px`,
                      backgroundColor: lightColors.warning,
                      color: 'white'
                    }}
                  >
                    Warning Tag
                  </span>
                  <span 
                    className="inline-flex items-center text-xs font-medium" 
                    style={{ 
                      padding: `${layoutSettings.labelPadding}px ${parseInt(layoutSettings.labelPadding) * 2.5}px`,
                      borderRadius: `${layoutSettings.labelRadius}px`,
                      backgroundColor: lightColors.destructive,
                      color: 'white'
                    }}
                  >
                    Error Status
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Live Typography Preview */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Live Typography Preview</CardTitle>
                <CardDescription>See your changes in real-time (Apply Theme to save)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 p-6 border rounded-md bg-background" style={{
                  fontFamily: brandSettings.primaryFont || 'Inter',
                  fontSize: `${layoutSettings.fontSize}px`
                }}>
                  <h1 style={{ 
                    fontSize: `calc(${layoutSettings.h1Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 700
                  }}>
                    H1: Main Page Title
                  </h1>
                  <h2 style={{ 
                    fontSize: `calc(${layoutSettings.h2Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 600
                  }}>
                    H2: Section Heading
                  </h2>
                  <h3 style={{ 
                    fontSize: `calc(${layoutSettings.h3Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 600
                  }}>
                    H3: Subsection Title
                  </h3>
                  <h4 style={{ 
                    fontSize: `calc(${layoutSettings.h4Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 500
                  }}>
                    H4: Card Header
                  </h4>
                  <h5 style={{ 
                    fontSize: `calc(${layoutSettings.h5Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 500
                  }}>
                    H5: Small Header
                  </h5>
                  <h6 style={{ 
                    fontSize: `calc(${layoutSettings.h6Size}px * ${layoutSettings.fontScale})`,
                    fontFamily: brandSettings.headingFont || 'Inter',
                    fontWeight: 500
                  }}>
                    H6: Tiny Header
                  </h6>
                  <p style={{ 
                    fontSize: `calc(${layoutSettings.fontSize}px * ${layoutSettings.fontScale})`,
                    lineHeight: 1.6
                  }}>
                    Regular paragraph text: This is how your body text will appear throughout the application. It uses the base font size with the global scale applied.
                  </p>
                  <p style={{ 
                    fontSize: `calc(${layoutSettings.smallSize}px * ${layoutSettings.fontScale})`,
                    opacity: 0.8
                  }}>
                    Small text: Used for descriptions, metadata, and secondary content.
                  </p>
                  <p style={{ 
                    fontSize: `calc(${layoutSettings.tinySize}px * ${layoutSettings.fontScale})`,
                    opacity: 0.6
                  }}>
                    Tiny text: Used for timestamps, labels, and fine print.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button size="default">Default Button</Button>
                    <Button size="sm">Small Button</Button>
                    <Button size="lg">Large Button</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Settings</CardTitle>
              <CardDescription>Configure your company branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={brandSettings.companyName}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={brandSettings.tagline}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Your company tagline"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={brandSettings.logoUrl}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Favicon URL</Label>
                  <Input
                    value={brandSettings.favicon}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, favicon: e.target.value }))}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Font</Label>
                  <select
                    value={brandSettings.primaryFont}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, primaryFont: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {availableFonts.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Heading Font</Label>
                  <select
                    value={brandSettings.headingFont}
                    onChange={(e) => setBrandSettings(prev => ({ ...prev, headingFont: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {availableFonts.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presetThemes.map((preset) => (
              <Card key={preset.name} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => loadPreset(preset)}>
                <CardHeader>
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div 
                        className="h-8 w-8 rounded" 
                        style={{ backgroundColor: preset.light.primary }}
                      />
                      <div 
                        className="h-8 w-8 rounded" 
                        style={{ backgroundColor: preset.light.secondary }}
                      />
                      <div 
                        className="h-8 w-8 rounded" 
                        style={{ backgroundColor: preset.light.accent }}
                      />
                      <div 
                        className="h-8 w-8 rounded" 
                        style={{ backgroundColor: preset.light.background }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Click to load preset</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Export Theme</CardTitle>
                <CardDescription>Download your theme configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportTheme} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Theme Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Theme</CardTitle>
                <CardDescription>Load a theme configuration file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={importTheme}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select a JSON theme configuration file
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}