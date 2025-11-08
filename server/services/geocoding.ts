import { storage } from '../storage';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.error('Decryption failed:', error?.message || 'Unknown error');
    throw new Error('Failed to decrypt Google Maps API key');
  }
}

// Hash address for cache lookup
function hashAddress(address: string): string {
  return crypto.createHash('sha256').update(address.toLowerCase().trim()).digest('hex');
}

// Generate random offset for location fallback (~500m radius)
function generateRandomOffset(): { latOffset: number, lngOffset: number } {
  const radius = 0.0045; // Approximately 500 meters at the equator
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * radius;
  
  return {
    latOffset: distance * Math.cos(angle),
    lngOffset: distance * Math.sin(angle)
  };
}

interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  method: 'gps' | 'google_maps' | 'location_fallback' | 'unmappable';
  status: 'success' | 'failed' | 'no_address';
  response?: any;
  error?: string;
}

interface CustomerData {
  id: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  street1?: string;
  street2?: string;
  city?: string;
  zip_code?: string;
  country?: string;
  location_id?: string;
}

class GeocodingService {
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 100; // 100ms between requests
  private apiKey: string | null = null;
  private organizationId: number;
  
  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }
  
  /**
   * Initialize the service by loading the Google Maps API key from the integration
   */
  async initialize(): Promise<void> {
    const integration = await storage.getIntegration(this.organizationId, 'google_maps');
    
    if (!integration || !integration.credentialsEncrypted) {
      throw new Error('Google Maps integration not configured for this organization');
    }
    
    try {
      const decrypted = decrypt(integration.credentialsEncrypted);
      const credentials = JSON.parse(decrypted);
      this.apiKey = credentials.apiKey;
    } catch (error) {
      throw new Error('Failed to load Google Maps API key');
    }
  }
  
  /**
   * Rate limit: wait if necessary before making a request
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Get cached geocoding result for a customer
   */
  private async getCachedGeocode(customerId: string, addressHash: string): Promise<GeocodeResult | null> {
    try {
      const cached = await storage.getGeocodingCacheByCustomerAndHash(this.organizationId, customerId, addressHash);
      
      if (cached) {
        return {
          latitude: cached.latitude ? parseFloat(cached.latitude) : null,
          longitude: cached.longitude ? parseFloat(cached.longitude) : null,
          method: cached.geocodeMethod as any,
          status: cached.geocodeStatus as any,
          response: cached.geocodeResponse
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching cached geocode:', error);
      return null;
    }
  }
  
  /**
   * Save geocoding result to cache
   */
  private async saveGeocodeCache(
    customerId: string,
    fullAddress: string,
    result: GeocodeResult
  ): Promise<void> {
    try {
      const addressHash = hashAddress(fullAddress);
      
      await storage.upsertGeocodingCache({
        organizationId: this.organizationId,
        splynxCustomerId: customerId,
        addressHash,
        fullAddress,
        latitude: result.latitude?.toString() || null,
        longitude: result.longitude?.toString() || null,
        geocodeMethod: result.method,
        geocodeStatus: result.status,
        geocodeResponse: result.response || {}
      });
    } catch (error) {
      console.error('Error saving geocode cache:', error);
    }
  }
  
  /**
   * Geocode an address using Google Maps API
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodeResult> {
    if (!this.apiKey) {
      throw new Error('API key not initialized');
    }
    
    await this.rateLimit();
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        
        // Log successful geocoding
        await storage.logActivity({
          organizationId: this.organizationId,
          userId: 1, // System user
          actionType: 'agent_action',
          entityType: 'integration',
          entityId: 0, // Integration ID would be better here
          description: `Geocoded address using Google Maps: ${address.substring(0, 50)}...`,
          metadata: {
            service: 'google_maps',
            address,
            result: 'success'
          }
        });
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          method: 'google_maps',
          status: 'success',
          response: data.results[0]
        };
      } else {
        // Geocoding failed
        return {
          latitude: null,
          longitude: null,
          method: 'unmappable',
          status: 'failed',
          error: data.error_message || data.status
        };
      }
    } catch (error: any) {
      return {
        latitude: null,
        longitude: null,
        method: 'unmappable',
        status: 'failed',
        error: error.message || 'Network error'
      };
    }
  }
  
  /**
   * Get default coordinates for a location with random offset
   */
  private async getLocationFallback(locationId: string): Promise<GeocodeResult | null> {
    try {
      const location = await storage.getSplynxLocation(this.organizationId, locationId);
      
      if (location && location.defaultLat && location.defaultLng) {
        const { latOffset, lngOffset } = generateRandomOffset();
        
        return {
          latitude: parseFloat(location.defaultLat) + latOffset,
          longitude: parseFloat(location.defaultLng) + lngOffset,
          method: 'location_fallback',
          status: 'success'
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Main geocoding method with priority system:
   * 1. GPS coordinates (if available)
   * 2. Google Maps Geocoding API (if address available)
   * 3. Location fallback with random offset
   * 4. Unmappable
   */
  async geocodeCustomer(customer: CustomerData): Promise<GeocodeResult> {
    // Priority 1: Use GPS coordinates if available
    if (customer.gps_lat && customer.gps_lng) {
      return {
        latitude: customer.gps_lat,
        longitude: customer.gps_lng,
        method: 'gps',
        status: 'success'
      };
    }
    
    // Build full address
    const addressParts = [
      customer.street1,
      customer.street2,
      customer.city,
      customer.zip_code,
      customer.country
    ].filter(part => part && part.trim().length > 0);
    
    const fullAddress = addressParts.join(', ');
    
    // Priority 2: Google Maps Geocoding (if address available)
    if (fullAddress.length > 0) {
      const addressHash = hashAddress(fullAddress);
      
      // Check cache first
      const cached = await this.getCachedGeocode(customer.id, addressHash);
      if (cached) {
        return cached;
      }
      
      // Geocode with Google Maps
      const googleResult = await this.geocodeWithGoogle(fullAddress);
      
      // Save to cache
      await this.saveGeocodeCache(customer.id, fullAddress, googleResult);
      
      if (googleResult.status === 'success') {
        return googleResult;
      }
    }
    
    // Priority 3: Location fallback
    if (customer.location_id) {
      const fallback = await this.getLocationFallback(customer.location_id);
      if (fallback) {
        return fallback;
      }
    }
    
    // Priority 4: Unmappable
    return {
      latitude: null,
      longitude: null,
      method: 'unmappable',
      status: fullAddress.length > 0 ? 'failed' : 'no_address'
    };
  }
  
  /**
   * Batch geocode multiple customers
   */
  async geocodeCustomers(customers: CustomerData[]): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();
    
    for (const customer of customers) {
      const result = await this.geocodeCustomer(customer);
      results.set(customer.id, result);
    }
    
    return results;
  }
}

export { GeocodingService, GeocodeResult, CustomerData };
