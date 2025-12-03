// GuerrillaMail API
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const apiBase = 'https://api.guerrillamail.com/ajax.php'
  
  // ============ GET NEW EMAIL ============
  if (path === '/api/new' || path === '/new') {
    try {
      // Get new email address
      const response = await fetch(`${apiBase}?f=get_email_address`)
      const data = await response.json()
      
      return jsonResponse({
        success: true,
        email: data.email_addr,
        alias: data.alias,
        sid_token: data.sid_token,
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
    const sid = url.searchParams.get('sid_token')
    const email = url.searchParams.get('email')
    
    if (!sid) {
      return jsonResponse({
        success: false,
        error: "sid_token parameter required"
      }, 400)
    }
    
    try {
      const response = await fetch(`${apiBase}?f=get_email_list&offset=0&sid_token=${sid}`)
      const data = await response.json()
      
      return jsonResponse({
        success: true,
        email: email || data.email_addr,
        count: data.count,
        messages: data.list
      })
    } catch (error) {
      return jsonResponse({
        success: false,
        error: "Failed to fetch inbox"
      }, 500)
    }
  }
  
  // ============ FETCH EMAIL ============
  if (path === '/api/fetch' || path === '/fetch') {
    const sid = url.searchParams.get('sid_token')
    const emailId = url.searchParams.get('email_id')
    
    if (!sid || !emailId) {
      return jsonResponse({
        success: false,
        error: "sid_token and email_id parameters required"
      }, 400)
    }
    
    try {
      const response = await fetch(`${apiBase}?f=fetch_email&email_id=${emailId}&sid_token=${sid}`)
      const data = await response.json()
      
      return jsonResponse({
        success: true,
        message: data
      })
    } catch (error) {
      return jsonResponse({
        success: false,
        error: "Failed to fetch email"
      }, 500)
    }
  }
  
  // ============ API DOCS ============
  return jsonResponse({
    api_name: "GuerrillaMail API",
    endpoints: {
      "Get new email": "/api/new",
      "Check inbox": "/api/inbox?sid_token=YOUR_TOKEN",
      "Read email": "/api/fetch?sid_token=TOKEN&email_id=ID"
    },
    note: "Save sid_token from /new response"
  })
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
