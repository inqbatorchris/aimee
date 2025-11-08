import axios from 'axios';

interface PXCCredentials {
  client_id: string;
  client_secret: string;
  billing_account_id: string;
}

interface PXCAuthResponse {
  partnerJWT: string;
  expiresIn?: number;
}

interface PXCOrder {
  id: string;
  state: string;
  lastUpdate: string;
  [key: string]: any;
}

export class PXCService {
  private baseAuthUrl = 'https://api.wholesale.talktalk.co.uk/partners/security/v1/api';
  private baseOrderUrl = 'https://api.wholesale.pxc.co.uk/partners/product-order/v3/api';
  
  async authenticate(credentials: PXCCredentials): Promise<string> {
    console.log('[PXCService] 🔐 Authenticating with PXC API...');
    
    try {
      const response = await axios.post<PXCAuthResponse>(
        `${this.baseAuthUrl}/token`,
        null,
        {
          headers: {
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
          },
          timeout: 30000
        }
      );
      
      console.log('[PXCService] ✓ Authentication successful');
      return response.data.partnerJWT;
    } catch (error: any) {
      console.error('[PXCService] ❌ Authentication failed:', error.message);
      if (error.response) {
        console.error('[PXCService] Response status:', error.response.status);
        console.error('[PXCService] Response data:', error.response.data);
      }
      throw new Error(`PXC authentication failed: ${error.message}`);
    }
  }
  
  async fetchOrders(
    token: string,
    billingAccountId: string,
    options: {
      limit?: number;
      fields?: string;
      offset?: number;
      state?: string;
      lastUpdateSince?: string;
    } = {}
  ): Promise<PXCOrder[]> {
    // Log options without sensitive data - token is passed as separate parameter
    console.log('[PXCService] 📥 Fetching orders with options:', {
      limit: options.limit,
      fields: options.fields,
      offset: options.offset,
      state: options.state,
      lastUpdateSince: options.lastUpdateSince,
      billingAccountId: billingAccountId
    });
    
    const params: any = {
      limit: options.limit || 1000,
      fields: options.fields || 'id,state,lastUpdate',
      offset: options.offset || 0,
      'billingAccount.id': billingAccountId,
      state: options.state || 'held,inProgress,failed,rejected',
    };
    
    if (options.lastUpdateSince) {
      params.lastUpdateSince = options.lastUpdateSince;
    }
    
    try {
      const response = await axios.get<PXCOrder[]>(
        `${this.baseOrderUrl}/productOrder`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000
        }
      );
      
      const orders = Array.isArray(response.data) ? response.data : [];
      console.log(`[PXCService] ✓ Fetched ${orders.length} orders`);
      return orders;
    } catch (error: any) {
      console.error('[PXCService] ❌ Failed to fetch orders:', error.message);
      if (error.response) {
        console.error('[PXCService] Response status:', error.response.status);
        console.error('[PXCService] Response data:', error.response.data);
      }
      throw new Error(`Failed to fetch PXC orders: ${error.message}`);
    }
  }
  
  async getOrderDetails(token: string, orderId: string): Promise<PXCOrder> {
    console.log(`[PXCService] 📄 Fetching details for order ${orderId}`);
    
    try {
      const response = await axios.get<PXCOrder>(
        `${this.baseOrderUrl}/productOrder/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000
        }
      );
      
      console.log(`[PXCService] ✓ Order details retrieved`);
      return response.data;
    } catch (error: any) {
      console.error(`[PXCService] ❌ Failed to fetch order details:`, error.message);
      if (error.response) {
        console.error('[PXCService] Response status:', error.response.status);
        console.error('[PXCService] Response data:', error.response.data);
      }
      throw new Error(`Failed to fetch order details: ${error.message}`);
    }
  }
  
  filterTodayOrders(orders: PXCOrder[]): PXCOrder[] {
    const today = new Date().toISOString().split('T')[0];
    const filtered = orders.filter(order => {
      const orderDate = new Date(order.lastUpdate).toISOString().split('T')[0];
      return orderDate === today;
    });
    
    console.log(`[PXCService] 📅 Filtered to ${filtered.length} orders from today (${today})`);
    return filtered;
  }
  
  categorizeOrdersByState(orders: PXCOrder[]): {
    held: PXCOrder[];
    inProgress: PXCOrder[];
    failed: PXCOrder[];
    rejected: PXCOrder[];
    other: PXCOrder[];
  } {
    const categorized = {
      held: [] as PXCOrder[],
      inProgress: [] as PXCOrder[],
      failed: [] as PXCOrder[],
      rejected: [] as PXCOrder[],
      other: [] as PXCOrder[]
    };
    
    orders.forEach(order => {
      const state = order.state?.toLowerCase();
      if (state === 'held') {
        categorized.held.push(order);
      } else if (state === 'inprogress' || state === 'in_progress') {
        categorized.inProgress.push(order);
      } else if (state === 'failed') {
        categorized.failed.push(order);
      } else if (state === 'rejected') {
        categorized.rejected.push(order);
      } else {
        categorized.other.push(order);
      }
    });
    
    console.log('[PXCService] 📊 Orders by state:', {
      held: categorized.held.length,
      inProgress: categorized.inProgress.length,
      failed: categorized.failed.length,
      rejected: categorized.rejected.length,
      other: categorized.other.length
    });
    
    return categorized;
  }
}
