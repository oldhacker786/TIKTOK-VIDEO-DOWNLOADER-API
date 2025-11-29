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
      // Step 3: Direct API call to cnic.sims.pk
      const simsUrl = `https://cnic.sims.pk/SIMInformationD.php?CNIC=${cnic}&MV=1&TV=0&UV=3&WV=0&ZV=1&MD=1&TD=0&UD=0&WD=0&ZD=0&TTV=5&TTD=1&error=`;
      
      console.log(`Fetching data for CNIC: ${cnic}`);
      
      const response = await fetch(simsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://cnic.sims.pk/',
          'Origin': 'https://cnic.sims.pk'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      
      // Step 4: Parse the HTML response
      const resultData = parseSimsData(html, cnic);

      // Step 5: Create final response
      const result = {
        status: "success",
        data: resultData,
        source: "cnic.sims.pk",
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
          message: "Unable to fetch SIM data",
          error: error.message,
          suggestion: "Please check if the CNIC is correct and try again",
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

// Parse cnic.sims.pk HTML data
function parseSimsData(html, cnic) {
  const networks = [];
  
  // Extract CNIC from HTML
  let extractedCnic = cnic;
  const cnicMatch = html.match(/ID Card Number:&nbsp;\s*(\d+)/);
  if (cnicMatch) {
    extractedCnic = cnicMatch[1];
  }

  // Extract Date
  let date = "Not Available";
  const dateMatch = html.match(/Date :&nbsp;\s*([^<]+)</);
  if (dateMatch) {
    date = dateMatch[1].trim();
  }

  // Extract network data using more precise parsing
  const networkData = {
    'Jazz': { voice: 0, data: 0, total: 0 },
    'Telenor': { voice: 0, data: 0, total: 0 },
    'Ufone': { voice: 0, data: 0, total: 0 },
    'Zong': { voice: 0, data: 0, total: 0 }
  };

  // Parse Jazz data
  const jazzMatch = html.match(/Jazz[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/);
  if (jazzMatch) {
    networkData.Jazz.voice = parseInt(jazzMatch[1]) || 0;
    networkData.Jazz.data = parseInt(jazzMatch[2]) || 0;
    networkData.Jazz.total = parseInt(jazzMatch[3]) || 0;
  }

  // Parse Telenor data
  const telenorMatch = html.match(/Telenor[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/);
  if (telenorMatch) {
    networkData.Telenor.voice = parseInt(telenorMatch[1]) || 0;
    networkData.Telenor.data = parseInt(telenorMatch[2]) || 0;
    networkData.Telenor.total = parseInt(telenorMatch[3]) || 0;
  }

  // Parse Ufone data
  const ufoneMatch = html.match(/Ufone[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/);
  if (ufoneMatch) {
    networkData.Ufone.voice = parseInt(ufoneMatch[1]) || 0;
    networkData.Ufone.data = parseInt(ufoneMatch[2]) || 0;
    networkData.Ufone.total = parseInt(ufoneMatch[3]) || 0;
  }

  // Parse Zong data
  const zongMatch = html.match(/Zong[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/);
  if (zongMatch) {
    networkData.Zong.voice = parseInt(zongMatch[1]) || 0;
    networkData.Zong.data = parseInt(zongMatch[2]) || 0;
    networkData.Zong.total = parseInt(zongMatch[3]) || 0;
  }

  // Parse Total data
  let totalVoice = 0, totalData = 0, totalAll = 0;
  const totalMatch = html.match(/Total[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/);
  if (totalMatch) {
    totalVoice = parseInt(totalMatch[1]) || 0;
    totalData = parseInt(totalMatch[2]) || 0;
    totalAll = parseInt(totalMatch[3]) || 0;
  }

  // Convert to networks array
  Object.keys(networkData).forEach(network => {
    if (networkData[network].voice > 0 || networkData[network].data > 0 || networkData[network].total > 0) {
      networks.push({
        network: network,
        voiceData: networkData[network].voice,
        dataOnly: networkData[network].data,
        total: networkData[network].total
      });
    }
  });

  // Add total row
  if (networks.length > 0) {
    networks.push({
      network: "Total",
      voiceData: totalVoice || networks.reduce((sum, net) => sum + net.voiceData, 0),
      dataOnly: totalData || networks.reduce((sum, net) => sum + net.dataOnly, 0),
      total: totalAll || networks.reduce((sum, net) => sum + net.total, 0)
    });
  }

  return {
    owner_info: {
      cnic: extractedCnic,
      date: date
    },
    sim_details: {
      total_numbers: totalAll || networks.find(n => n.network === "Total")?.total || 0,
      networks: networks.filter(n => n.network !== "Total"),
      summary: {
        totalVoiceData: totalVoice || networks.find(n => n.network === "Total")?.voiceData || 0,
        totalDataOnly: totalData || networks.find(n => n.network === "Total")?.dataOnly || 0,
        overallTotal: totalAll || networks.find(n => n.network === "Total")?.total || 0
      }
    }
  };
  }
