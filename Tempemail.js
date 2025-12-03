// Temp Email API using TempMail.lol
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const apiBase = 'https://api.tempmail.lol'
  
  // ============ GENERATE NEW EMAIL ============
  if (path === '/api/new' || path === '/new') {
    try {
      // Get available domains first
      const domainsRes = await fetch(`${apiBase}/gen`)
      const domainsData = await domainsRes.json()
      
      // Create email from first available domain
      const emailRes = await fetch(`${apiBase}/gen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: Math.random().toString(36).substring(2, 10),
          domain: domainsData.domains[0] || 'tempmail.lol'
        })
      })
      
      const emailData = await emailRes.json()
      
      return jsonResponse({
        success: true,
        email: emailData.address,
        token: emailData.token, // Save this for checking inbox
        expires: emailData.expires,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return jsonResponse({
        success: false,
        error: "Failed to generate email"
      }, 500)
    }
  }
  
  // ============ CHECK INBOX ============
  if (path === '/api/inbox' || path === '/inbox') {
    const token = url.searchParams.get('token')
    const email = url.searchParams.get('email')
    
    if (!token) {
      return jsonResponse({
        success: false,
        error: "Token parameter required"
      }, 400)
    }
    
    try {
      const response = await fetch(`${apiBase}/auth/${token}`)
      const inbox = await response.json()
      
      return jsonResponse({
        success: true,
        email: email || inbox.email,
        count: inbox.email.length,
        messages: inbox.email
      })
    } catch (error) {
      return jsonResponse({
        success: false,
        error: "Failed to fetch inbox"
      }, 500)
    }
  }
  
  // ============ API INFO ============
  if (path === '/' || path === '/help') {
    return jsonResponse({
      api_name: "Temp Mail API",
      service: "TempMail.lol",
      endpoints: {
        "Create new email": "/api/new",
        "Check inbox": "/api/inbox?token=YOUR_TOKEN&email=optional@email.com"
      },
      note: "Save the 'token' from /new response to check inbox"
    })
  }
  
  return jsonResponse({
    success: false,
    error: "Endpoint not found"
  }, 404)
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
