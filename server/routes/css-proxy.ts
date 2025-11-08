import { Router } from 'express';

const router = Router();

// Proxy route for WordPress CSS and assets
router.get('/wp-proxy/*', async (req, res) => {
  try {
    const wpUrl = (req.params as any)[0] as string;
    const fullUrl = `https://www.country-connect.co.uk/${wpUrl}`;
    
    console.log('[CSS Proxy] Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.country-connect.co.uk/',
        'Origin': 'https://www.country-connect.co.uk',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('[CSS Proxy] Failed to fetch:', fullUrl, response.status);
      return res.status(response.status).send('Failed to fetch resource');
    }

    const contentType = response.headers.get('content-type') || 'text/css';
    const content = await response.text();
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(content);
  } catch (error) {
    console.error('[CSS Proxy] Error:', error);
    res.status(500).send('Proxy error');
  }
});

export default router;
