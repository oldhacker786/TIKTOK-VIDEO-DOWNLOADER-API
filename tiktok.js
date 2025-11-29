export default {
  async fetch(request) {
    const url = new URL(request.url);
    const cnic = url.searchParams.get('cnic');

    // Step 1: Validate CNIC
    if (!cnic) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing CNIC parameter. Use ?cnic=YOUR_CNIC_NUMBER'
        }, null, 2),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Step 2: Validate CNIC format (13 digits)
    const cnicRegex = /^\d{13}$/;
    if (!cnicRegex.test(cnic)) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid CNIC format. Must be 13 digits without dashes.'
        }, null, 2),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    try {
      // Step 3: Try multiple sources
      let resultData = null;
      
      // Source 1: Try cnic.sims.pk (with proper headers)
      try {
        console.log('Trying cnic.sims.pk...');
        const simsUrl = `https://cnic.sims.pk/SIMInformationD.php?CNIC=${cnic}&MV=1&TV=0&UV=3&WV=0&ZV=1&MD=1&TD=0&UD=0&WD=0&ZD=0&TTV=5&TTD=1&error=`;
        
        const simsResponse = await fetch(simsUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://cnic.sims.pk/',
            'Origin': 'https://cnic.sims.pk'
          }
        });

        if (simsResponse.ok) {
          const html = await simsResponse.text();
          
          // Check if it's asking for CAPTCHA
          if (!html.includes('recaptcha') && !html.includes('captcha')) {
            resultData = parseSimsPKData(html, cnic);
            console.log('Successfully got data from cnic.sims.pk');
          }
        }
      } catch (error) {
        console.log('cnic.sims.pk failed:', error.message);
      }

      // Source 2: Try alternative APIs if first fails
      if (!resultData) {
        console.log('Trying alternative sources...');
        
        // You can add more sources here
        resultData = await tryAlternativeSources(cnic);
      }

      // Step 4: Create final response
      const result = {
        status: "success",
        data: resultData || {
          cnic: cnic,
          message: "Unable to fetch data automatically due to CAPTCHA protection",
          suggestion: "Please visit https://cnic.sims.pk directly and complete the CAPTCHA"
        },
        source: resultData ? "cnic.sims.pk" : "multiple_sources",
        timestamp: new Date().toISOString(),
        credit: "@old_studio786"
      };

      return new Response(
        JSON.stringify(result, null, 2),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        }
      );

    } catch (error) {
      console.error('Error:', error);
      
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Unable to fetch data from official sources",
          suggestion: "Official sources require human verification with CAPTCHA",
          official_links: [
            "https://cnic.sims.pk",
            "https://dirbs.pta.gov.pk",
            "https://siminfo.pta.gov.pk"
          ],
          credit: "@old_studio786"
        }, null, 2),
        {
          status: 503, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }
};

// Parse cnic.sims.pk data
function parseSimsPKData(html, cnic) {
  const networks = [];
  let ownerName = "Not Available";
  let address = "Not Available";
  
  // Extract SIM information from table
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex);
  
  if (tables) {
    for (const table of tables) {
      // Look for network data
      if (table.includes('Jazz') || table.includes('Telenor') || table.includes('Ufone') || table.includes('Zong')) {
        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
        
        if (rows) {
          for (const row of rows) {
            // Jazz row
            if (row.includes('Jazz')) {
              const counts = extractNumbersFromRow(row);
              networks.push({
                network: "Jazz",
                voiceData: counts[0] || 0,
                dataOnly: counts[1] || 0,
                total: counts[2] || 0
              });
            }
            // Telenor row
            else if (row.includes('Telenor')) {
              const counts = extractNumbersFromRow(row);
              networks.push({
                network: "Telenor",
                voiceData: counts[0] || 0,
                dataOnly: counts[1] || 0,
                total: counts[2] || 0
              });
            }
            // Ufone row
            else if (row.includes('Ufone')) {
              const counts = extractNumbersFromRow(row);
              networks.push({
                network: "Ufone",
                voiceData: counts[0] || 0,
                dataOnly: counts[1] || 0,
                total: counts[2] || 0
              });
            }
            // Zong row
            else if (row.includes('Zong')) {
              const counts = extractNumbersFromRow(row);
              networks.push({
                network: "Zong",
                voiceData: counts[0] || 0,
                dataOnly: counts[1] || 0,
                total: counts[2] || 0
              });
            }
            // Total row
            else if (row.includes('Total') && !row.includes('Network')) {
              const counts = extractNumbersFromRow(row);
              networks.push({
                network: "Total",
                voiceData: counts[0] || 0,
                dataOnly: counts[1] || 0,
                total: counts[2] || 0
              });
            }
          }
        }
      }
    }
  }

  // Try to extract date
  let date = "Not Available";
  const dateMatch = html.match(/Date\s*:&nbsp;\s*([^<]+)/i);
  if (dateMatch) {
    date = dateMatch[1].trim();
  }

  return {
    owner_info: {
      name: ownerName,
      cnic: cnic,
      father_name: "Not Available",
      address: address
    },
    sim_details: {
      total_numbers: networks.find(n => n.network === "Total")?.total || 0,
      networks: networks.filter(n => n.network !== "Total"),
      date: date
    },
    summary: {
      totalVoiceData: networks.find(n => n.network === "Total")?.voiceData || 0,
      totalDataOnly: networks.find(n => n.network === "Total")?.dataOnly || 0,
      overallTotal: networks.find(n => n.network === "Total")?.total || 0
    }
  };
}

// Extract numbers from table row
function extractNumbersFromRow(row) {
  const numbers = [];
  const tdRegex = /<td[^>]*>([^<]*)<\/td>/gi;
  let match;
  
  while ((match = tdRegex.exec(row)) !== null) {
    const content = match[1].trim();
    const numberMatch = content.match(/\d+/);
    if (numberMatch) {
      numbers.push(parseInt(numberMatch[0]));
    }
  }
  
  return numbers;
}

// Try alternative sources
async function tryAlternativeSources(cnic) {
  // Add other SIM database websites here
  const alternativeUrls = [
    `https://siminfo.pta.gov.pk/api/sim-check/${cnic}`,
    `https://paksiminfo.com/check/${cnic}`
  ];
  
  for (const url of alternativeUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.text();
        // Parse the alternative source data
        // Add parsing logic here based on the source format
      }
    } catch (error) {
      console.log(`Alternative source failed: ${url}`);
    }
  }
  
  return null;
          }
