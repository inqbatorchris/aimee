import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { booleanPointInPolygon, point, polygon } from '@turf/turf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Search, Tags, AlertCircle, CheckCircle, Square, Trash2, X, ChevronDown, ChevronUp, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Interface for Splynx labels
interface SplynxLabel {
  id: string;
  title: string;
}

// Interface for Splynx locations
interface SplynxLocation {
  id: string;
  name: string;
}

interface CustomerLocation {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street1: string;
    street2: string;
    city: string;
    zipCode: string;
    country: string;
    full: string;
  };
  status: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  hasCoordinates: boolean;
  geocodeStatus?: string;
  geocodeMethod?: string;
  gpsLat?: string;
  gpsLng?: string;
  what3words?: string;
  services: any[];
  labels: string[];
  lastUpdate: string;
}

interface CustomerSearchResult {
  customers: CustomerLocation[];
  unmappable: CustomerLocation[];
  summary: {
    total: number;
    mappable: number;
    unmappable: number;
    geocoded: number;
    hasGps: number;
  };
}

interface BulkLabelResponse {
  success: boolean;
  labelId: string;
  totalCustomers: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    customerId: string;
    status: string;
    error?: string;
  }>;
}

// Component to handle map clicks for polygon creation
function PolygonDrawer({ 
  isDrawing, 
  onPolygonComplete, 
  currentPolygon, 
  onPointAdd 
}: {
  isDrawing: boolean;
  onPolygonComplete: (coords: [number, number][]) => void;
  currentPolygon: [number, number][];
  onPointAdd: (point: [number, number]) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!isDrawing) return;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onPointAdd([lat, lng]);
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isDrawing, onPointAdd]);
  
  return null;
}

// Splynx Customer Link Component
function SplynxCustomerLink({ 
  customerId, 
  baseUrl 
}: { 
  customerId: string; 
  baseUrl?: string;
}) {
  if (!baseUrl) return null;

  const handleClick = () => {
    const url = `${baseUrl}/admin/customers/customer/${customerId}/view`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-6 w-6 p-0" 
      onClick={handleClick}
      data-testid={`button-view-customer-${customerId}`}
      title="View in Splynx"
    >
      <Eye className="w-3 h-3" />
    </Button>
  );
}

// Draggable Filter Panel Component
function DraggableFilterPanel({ 
  children, 
  isVisible, 
  onToggleVisibility 
}: { 
  children: React.ReactNode;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header/grip area
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!isVisible) {
    return (
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          onClick={onToggleVisibility}
          size="sm"
          className="shadow-lg h-7 text-xs px-2"
          data-testid="button-show-filters"
        >
          <Eye className="w-3 h-3 mr-1" />
          Show
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute z-[1000] bg-white rounded-lg shadow-2xl border border-gray-300"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? 'auto' : '210px',
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      data-testid="filter-panel"
    >
      <div className="drag-handle flex items-center justify-between p-1.5 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3 text-gray-400" />
          <h3 className="font-semibold text-xs text-gray-700">Filters</h3>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="button-toggle-collapse"
          >
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onToggleVisibility}
            data-testid="button-hide-filters"
          >
            <EyeOff className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-2 max-h-[80vh] overflow-y-auto text-xs">
          {children}
        </div>
      )}
    </div>
  );
}

export default function CustomerMapping() {
  const [filterType, setFilterType] = useState<'service_area' | 'customer_location' | 'customer_status' | 'lead_status'>('customer_location');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCustomerStatus, setSelectedCustomerStatus] = useState('');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('');
  const [selectedPolygon, setSelectedPolygon] = useState<[number, number][]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerLocation[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [isLabeling, setIsLabeling] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UK center coordinates as default
  const defaultCenter: [number, number] = [54.5, -2.5];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(6);
  const mapRef = useRef<L.Map | null>(null);

  // Sync locations from Splynx on mount
  const syncLocationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/splynx/locations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync locations');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/locations'] });
      toast({
        title: "Locations Synced",
        description: "Successfully synced locations from Splynx",
      });
    },
    onError: (error: Error) => {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync locations from Splynx",
        variant: "destructive",
      });
    },
  });

  // Auto-sync locations on mount - silently
  useEffect(() => {
    const silentSync = async () => {
      try {
        await fetch('/api/splynx/locations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        queryClient.invalidateQueries({ queryKey: ['/api/splynx/locations'] });
      } catch (error) {
        // Silent sync - only show error if it fails
        console.error('Background sync failed:', error);
      }
    };
    silentSync();
  }, []);

  // Fetch available service area locations from Splynx
  const { data: serviceAreaLocations = [], isLoading: serviceAreasLoading } = useQuery<SplynxLocation[]>({
    queryKey: ['/api/splynx/locations'],
  });

  // Fetch customer locations from Splynx
  const { data: customerLocations = [], isLoading: customerLocationsLoading } = useQuery<SplynxLocation[]>({
    queryKey: ['/api/splynx/customer-locations'],
  });

  // Fetch available labels from Splynx
  const { data: availableLabels = [], isLoading: labelsLoading } = useQuery<SplynxLabel[]>({
    queryKey: ['/api/splynx/customer-labels'],
  });

  // Fetch Splynx installation to get baseUrl for customer links
  const { data: splynxInstallation } = useQuery<{ baseUrl: string }>({
    queryKey: ['/api/splynx/installation'],
  });
  
  // Search customers by location or status
  const { data: searchResult, isLoading: isSearching, refetch: searchCustomers } = useQuery<CustomerSearchResult>({
    queryKey: ['/api/splynx/customers/location-search', { 
      locationId: selectedLocationId, 
      filterType,
      statusValue: filterType === 'customer_status' ? selectedCustomerStatus : filterType === 'lead_status' ? selectedLeadStatus : ''
    }],
    enabled: false, // Manual trigger
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey;
      console.log('[FRONTEND] Search params:', params);
      
      const queryParams = new URLSearchParams(params as any);
      const url = `/api/splynx/customers/location-search?${queryParams.toString()}`;
      console.log('[FRONTEND] Request URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }
      return response.json();
    }
  });

  const customers = searchResult?.customers || [];
  const unmappableCustomers = searchResult?.unmappable || [];
  const searchSummary = searchResult?.summary;
  
  // Bulk label mutation
  const labelCustomersMutation = useMutation<BulkLabelResponse, Error, { customerIds: string[]; labelId: string }>({
    mutationFn: async (data) => {
      const response = await fetch('/api/splynx/customers/bulk-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const selectedLabel = availableLabels.find((l: any) => l.id === data.labelId);
      toast({
        title: "Labels Added Successfully",
        description: `Added "${selectedLabel?.title}" to ${data.successCount} customers`,
      });
      setIsLabeling(false);
      setSelectedLabelId('');
      queryClient.invalidateQueries({ queryKey: ['/api/splynx/customers/location-search'] });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Labels",
        description: error.message || "Failed to add labels to selected customers",
        variant: "destructive",
      });
    },
  });

  const handleSearch = async () => {
    // Validate based on filter type
    if (filterType === 'customer_location' || filterType === 'service_area') {
      if (!selectedLocationId) {
        toast({
          title: "Location Required",
          description: "Please select a location to search for customers",
          variant: "destructive",
        });
        return;
      }
    } else if (filterType === 'customer_status') {
      if (!selectedCustomerStatus) {
        toast({
          title: "Status Required",
          description: "Please select a customer status to search",
          variant: "destructive",
        });
        return;
      }
    } else if (filterType === 'lead_status') {
      if (!selectedLeadStatus) {
        toast({
          title: "Lead Status Required",
          description: "Please select a lead status to search",
          variant: "destructive",
        });
        return;
      }
    }
    
    const result = await searchCustomers();
    
    // Center map on search results if we have customers with coordinates
    if (result.data?.customers && result.data.customers.length > 0) {
      const mappableCustomers = result.data.customers;
      
      // Calculate bounds to fit all customers
      const lats = mappableCustomers.map((c: CustomerLocation) => c.coordinates.lat);
      const lngs = mappableCustomers.map((c: CustomerLocation) => c.coordinates.lng);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Use setTimeout to ensure the map is ready
      setTimeout(() => {
        if (mapRef.current) {
          const bounds = L.latLngBounds([
            [minLat, minLng],
            [maxLat, maxLng]
          ]);
          
          // Add some padding around the bounds
          const paddedBounds = bounds.pad(0.1);
          mapRef.current.fitBounds(paddedBounds);
        }
      }, 100);
      
      toast({
        title: "Search Complete",
        description: `Found ${result.data.summary.total} customers: ${result.data.summary.mappable} mapped, ${result.data.summary.unmappable} unmappable`,
      });
    } else if (result.data?.summary.total === 0) {
      toast({
        title: "No Results",
        description: "No customers found for this location",
        variant: "destructive",
      });
    }
  };
  
  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
    setSelectedPolygon([]);
    setSelectedCustomers([]);
    toast({
      title: "Drawing Mode",
      description: "Click on the map to create polygon points. Click finish when done.",
    });
  };
  
  const addPolygonPoint = (point: [number, number]) => {
    setCurrentPolygon(prev => [...prev, point]);
  };
  
  const finishPolygon = () => {
    if (currentPolygon.length < 3) {
      toast({
        title: "Invalid Polygon",
        description: "A polygon needs at least 3 points",
        variant: "destructive",
      });
      return;
    }
    
    // Close the polygon by ensuring first and last points are identical
    const closedPolygon = [...currentPolygon];
    const firstPoint = closedPolygon[0];
    const lastPoint = closedPolygon[closedPolygon.length - 1];
    
    // Check if polygon is already closed
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      closedPolygon.push([firstPoint[0], firstPoint[1]]);
    }
    
    setSelectedPolygon(closedPolygon);
    setIsDrawing(false);
    
    // Find customers within the polygon
    const customersInPolygon = customers.filter((customer: CustomerLocation) => {
      if (!customer.hasCoordinates) return false;
      
      const customerPoint = point([customer.coordinates.lng, customer.coordinates.lat]);
      // Create properly closed polygon for Turf.js
      const polygonCoords = closedPolygon.map(([lat, lng]) => [lng, lat]);
      const poly = polygon([polygonCoords]);
      
      return booleanPointInPolygon(customerPoint, poly);
    });
    
    setSelectedCustomers(customersInPolygon);
    
    toast({
      title: "Polygon Created",
      description: `Selected ${customersInPolygon.length} customers within the polygon`,
    });
  };
  
  const clearPolygon = () => {
    setSelectedPolygon([]);
    setCurrentPolygon([]);
    setSelectedCustomers([]);
    setIsDrawing(false);
  };

  const handleAddLabels = async () => {
    if (!selectedLabelId) {
      toast({
        title: "Label Required",
        description: "Please select a label from the dropdown",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please draw a polygon to select customers first",
        variant: "destructive",
      });
      return;
    }
    
    setIsLabeling(true);
    
    await labelCustomersMutation.mutateAsync({
      customerIds: selectedCustomers.map(c => c.id),
      labelId: selectedLabelId,
    });
  };
  
  // Create custom icon for customers
  const createCustomerIcon = (customer: CustomerLocation) => {
    const isSelected = selectedCustomers.some(c => c.id === customer.id);
    const color = isSelected ? '#ef4444' : customer.status === 'active' ? '#22c55e' : '#f59e0b';
    
    return L.divIcon({
      html: `<div class="marker-dot" style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.2s ease;" 
                  title="${customer.name} - ${customer.status} - ${customer.address.city}"></div>`,
      className: 'customer-marker-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Map Container */}
      <div className="relative flex-1" style={{ height: 'calc(100vh - 120px)' }} data-testid="map-container">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <PolygonDrawer
            isDrawing={isDrawing}
            onPolygonComplete={finishPolygon}
            currentPolygon={currentPolygon}
            onPointAdd={addPolygonPoint}
          />
          
          {/* Customer Markers */}
          {customers.map((customer: CustomerLocation) => (
            <Marker
              key={customer.id}
              position={[customer.coordinates.lat, customer.coordinates.lng]}
              icon={createCustomerIcon(customer)}
            >
              <Popup>
                <div className="p-3 min-w-80" data-testid={`popup-customer-${customer.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1" data-testid={`text-customer-name-${customer.id}`}>{customer.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={customer.status === 'active' ? 'default' : 'secondary'} 
                          className={`text-xs ${customer.status === 'active' ? 'bg-green-600' : ''}`}
                          data-testid={`badge-customer-status-${customer.id}`}
                        >
                          {customer.status}
                        </Badge>
                        {customer.services && customer.services.length > 0 && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-customer-services-${customer.id}`}>
                            {customer.services.length} service{customer.services.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <SplynxCustomerLink customerId={customer.id} baseUrl={splynxInstallation?.baseUrl} />
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    {customer.email && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-16">Email:</span>
                        <span className="text-gray-700 break-all" data-testid={`text-customer-email-${customer.id}`}>{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.phone && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-16">Phone:</span>
                        <span className="text-gray-700" data-testid={`text-customer-phone-${customer.id}`}>{customer.phone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-16">Address:</span>
                      <span className="text-gray-700" data-testid={`text-customer-address-${customer.id}`}>{customer.address.full}</span>
                    </div>
                    
                    {customer.geocodeStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 min-w-16">Location:</span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-customer-geocode-${customer.id}`}>
                          {customer.geocodeStatus}
                          {customer.geocodeMethod && ` (${customer.geocodeMethod})`}
                        </Badge>
                      </div>
                    )}
                    
                    {customer.what3words && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-16">What3Words:</span>
                        <span className="text-gray-700" data-testid={`text-customer-w3w-${customer.id}`}>{customer.what3words}</span>
                      </div>
                    )}
                    
                    {customer.lastUpdate && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-16">Updated:</span>
                        <span className="text-gray-600" data-testid={`text-customer-lastupdate-${customer.id}`}>
                          {new Date(customer.lastUpdate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {customer.labels && customer.labels.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-gray-500 mb-1">Labels:</div>
                        <div className="flex flex-wrap gap-1">
                          {customer.labels.map((labelId, idx) => {
                            const label = availableLabels.find(l => l.id === labelId);
                            return label ? (
                              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-customer-label-${labelId}`}>
                                {label.title}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {splynxInstallation?.baseUrl && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const url = `${splynxInstallation.baseUrl}/admin/customers/customer/${customer.id}/view`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        data-testid={`button-view-splynx-${customer.id}`}
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        View in Splynx
                      </Button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Selection Polygon */}
          {selectedPolygon.length > 0 && (
            <Polygon
              positions={selectedPolygon}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
          
          {/* Current Drawing Polygon */}
          {isDrawing && currentPolygon.length > 0 && (
            <Polygon
              positions={currentPolygon}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5',
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Floating Draggable Filter Panel */}
      <DraggableFilterPanel 
        isVisible={isFilterVisible} 
        onToggleVisibility={() => setIsFilterVisible(!isFilterVisible)}
      >
        <div className="space-y-2">
          {/* Sync Status Indicator */}
          {(serviceAreasLoading || customerLocationsLoading) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Syncing...</span>
            </div>
          )}

          {/* Unified Filter Section */}
          <div className="space-y-1">
            <Label className="text-[10px] font-medium">Filter Type</Label>
            <ToggleGroup 
              type="single" 
              value={filterType} 
              onValueChange={(value) => {
                if (value) {
                  setFilterType(value as any);
                  // Clear selections when switching modes
                  setSelectedLocationId('');
                  setSelectedCustomerStatus('');
                  setSelectedLeadStatus('');
                }
              }}
              className="grid grid-cols-2 gap-1"
            >
              <ToggleGroupItem value="customer_location" className="h-6 text-[10px] px-1" data-testid="toggle-location">
                Location
              </ToggleGroupItem>
              <ToggleGroupItem value="service_area" className="h-6 text-[10px] px-1" data-testid="toggle-service-area">
                Service
              </ToggleGroupItem>
              <ToggleGroupItem value="customer_status" className="h-6 text-[10px] px-1" data-testid="toggle-status">
                Status
              </ToggleGroupItem>
              <ToggleGroupItem value="lead_status" className="h-6 text-[10px] px-1" data-testid="toggle-lead">
                Lead
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Conditional Dropdown based on filter type */}
            <div className="space-y-1 pt-1">
              {filterType === 'service_area' && (
                <Select 
                  value={selectedLocationId} 
                  onValueChange={setSelectedLocationId}
                  disabled={serviceAreasLoading || serviceAreaLocations.length === 0}
                >
                  <SelectTrigger className="h-7 text-[10px]" data-testid="select-service-area">
                    <SelectValue placeholder={
                      serviceAreasLoading 
                        ? "Loading..." 
                        : serviceAreaLocations.length === 0
                          ? "No service areas"
                          : "Select service area..."
                    } />
                  </SelectTrigger>
                  <SelectContent className="text-[10px]">
                    {serviceAreaLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id} data-testid={`option-service-area-${location.id}`}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'customer_location' && (
                <Select 
                  value={selectedLocationId} 
                  onValueChange={setSelectedLocationId}
                  disabled={customerLocationsLoading || customerLocations.length === 0}
                >
                  <SelectTrigger className="h-7 text-[10px]" data-testid="select-customer-location">
                    <SelectValue placeholder={
                      customerLocationsLoading 
                        ? "Loading..." 
                        : customerLocations.length === 0
                          ? "No locations"
                          : "Select location..."
                    } />
                  </SelectTrigger>
                  <SelectContent className="text-[10px]">
                    {customerLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id} data-testid={`option-location-${location.id}`}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'customer_status' && (
                <Select 
                  value={selectedCustomerStatus} 
                  onValueChange={setSelectedCustomerStatus}
                >
                  <SelectTrigger className="h-7 text-[10px]" data-testid="select-customer-status">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent className="text-[10px]">
                    <SelectItem value="new" data-testid="option-status-new">New</SelectItem>
                    <SelectItem value="active" data-testid="option-status-active">Active</SelectItem>
                    <SelectItem value="blocked" data-testid="option-status-blocked">Blocked</SelectItem>
                    <SelectItem value="inactive" data-testid="option-status-inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {filterType === 'lead_status' && (
                <Select 
                  value={selectedLeadStatus} 
                  onValueChange={setSelectedLeadStatus}
                >
                  <SelectTrigger className="h-7 text-[10px]" data-testid="select-lead-status">
                    <SelectValue placeholder="Select lead status..." />
                  </SelectTrigger>
                  <SelectContent className="text-[10px]">
                    <SelectItem value="new" data-testid="option-lead-new">New</SelectItem>
                    <SelectItem value="check_availability" data-testid="option-lead-check">Check Availability</SelectItem>
                    <SelectItem value="verify_service" data-testid="option-lead-verify">Verify Service</SelectItem>
                    <SelectItem value="details_confirmed" data-testid="option-lead-confirmed">Details Confirmed</SelectItem>
                    <SelectItem value="won" data-testid="option-lead-won">Won</SelectItem>
                    <SelectItem value="lost" data-testid="option-lead-lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Single Search Button */}
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || (
                  (filterType === 'customer_location' && !selectedLocationId) ||
                  (filterType === 'customer_status' && !selectedCustomerStatus) ||
                  (filterType === 'lead_status' && !selectedLeadStatus)
                )}
                className="w-full h-7 text-[11px] px-2"
                data-testid="button-search"
              >
                {isSearching ? (
                  <>
                    <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3 mr-1" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search Summary */}
          {searchSummary && (
            <div className="space-y-1 pt-2 border-t">
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <Badge variant="outline" className="justify-center h-5 px-1" data-testid="badge-total-customers">
                  <Users className="w-2.5 h-2.5 mr-0.5" />
                  {searchSummary.total}
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 justify-center h-5 px-1" data-testid="badge-mappable-customers">
                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  {searchSummary.mappable}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 justify-center h-5 px-1" data-testid="badge-unmappable-customers">
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                  {searchSummary.unmappable}
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 justify-center h-5 px-1" data-testid="badge-geocoded-customers">
                  <MapPin className="w-2.5 h-2.5 mr-0.5" />
                  {searchSummary.geocoded}
                </Badge>
              </div>
            </div>
          )}

          {/* Drawing Controls */}
          {customers.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <Label className="text-xs font-medium">Selection Tools</Label>
              
              {!isDrawing && selectedPolygon.length === 0 && (
                <Button 
                  onClick={startDrawing} 
                  variant="outline" 
                  className="w-full h-7 text-xs px-2"
                  data-testid="button-start-drawing"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Draw Area
                </Button>
              )}

              {isDrawing && (
                <div className="space-y-1">
                  <Button 
                    onClick={finishPolygon} 
                    className="w-full h-7 text-xs px-2"
                    disabled={currentPolygon.length < 3}
                    data-testid="button-finish-polygon"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Finish ({currentPolygon.length})
                  </Button>
                  <Button 
                    onClick={clearPolygon} 
                    variant="outline" 
                    className="w-full h-7 text-xs px-2"
                    data-testid="button-cancel-drawing"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}

              {selectedPolygon.length > 0 && !isDrawing && (
                <Button 
                  onClick={clearPolygon} 
                  variant="outline" 
                  className="w-full h-7 text-xs px-2"
                  data-testid="button-clear-selection"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Label Assignment */}
          {selectedCustomers.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <Label htmlFor="label-select" className="text-xs font-medium">
                Label {selectedCustomers.length} Selected
              </Label>
              <Select value={selectedLabelId} onValueChange={setSelectedLabelId}>
                <SelectTrigger id="label-select" data-testid="select-label">
                  <SelectValue placeholder={labelsLoading ? "Loading..." : "Select label..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableLabels.map((label) => (
                    <SelectItem key={label.id} value={label.id} data-testid={`option-label-${label.id}`}>
                      {label.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddLabels} 
                disabled={isLabeling || !selectedLabelId} 
                className="w-full h-7 text-xs px-2"
                data-testid="button-add-labels"
              >
                <Tags className="w-3 h-3 mr-1" />
                {isLabeling ? 'Adding...' : 'Add'}
              </Button>
            </div>
          )}
        </div>
      </DraggableFilterPanel>

      {/* Customer List Panels - Bottom */}
      {(customers.length > 0 || unmappableCustomers.length > 0) && (
        <div className="bg-white border-t shadow-lg">
          <div className="px-4 py-3 space-y-3">
            
            {/* Mapped Customers Panel */}
            {customers.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700" data-testid="button-toggle-mapped">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Mapped Customers ({customers.length})
                  <span className="text-xs text-gray-500 ml-auto">Click to view</span>
                </summary>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {customers.map((customer: CustomerLocation) => (
                    <Card key={customer.id} className="p-2" data-testid={`card-mapped-customer-${customer.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate" data-testid={`text-mapped-name-${customer.id}`}>{customer.name}</h4>
                          <p className="text-xs text-gray-600 truncate" data-testid={`text-mapped-email-${customer.id}`}>{customer.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge 
                              variant={customer.status === 'active' ? 'default' : 'secondary'} 
                              className={`text-xs ${customer.status === 'active' ? 'bg-green-600' : ''}`}
                              data-testid={`badge-mapped-status-${customer.id}`}
                            >
                              {customer.status}
                            </Badge>
                            {customer.geocodeMethod && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-mapped-method-${customer.id}`}>
                                {customer.geocodeMethod}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <SplynxCustomerLink customerId={customer.id} baseUrl={splynxInstallation?.baseUrl} />
                      </div>
                    </Card>
                  ))}
                </div>
              </details>
            )}

            {/* Unmappable Customers Panel */}
            {unmappableCustomers.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700" data-testid="button-toggle-unmappable">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Unmappable Customers ({unmappableCustomers.length})
                  <span className="text-xs text-gray-500 ml-auto">Click to view</span>
                </summary>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {unmappableCustomers.map((customer: CustomerLocation) => (
                    <Card key={customer.id} className="p-2" data-testid={`card-unmappable-customer-${customer.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate" data-testid={`text-unmappable-name-${customer.id}`}>{customer.name}</h4>
                          <p className="text-xs text-gray-600 truncate" data-testid={`text-unmappable-address-${customer.id}`}>{customer.address.full}</p>
                          <Badge variant="outline" className="text-xs mt-1" data-testid={`badge-unmappable-reason-${customer.id}`}>
                            {customer.geocodeStatus || 'No coordinates'}
                          </Badge>
                        </div>
                        <SplynxCustomerLink customerId={customer.id} baseUrl={splynxInstallation?.baseUrl} />
                      </div>
                    </Card>
                  ))}
                </div>
              </details>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
