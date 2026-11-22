async function verify() {
  try {
    const res = await fetch('http://localhost:3000');
    const html = await res.text();
    const hasOld = /routine\s+thu\s+đông/i.test(html);
    console.log('Homepage contains "Routine Thu Đông":', hasOld);
    
    // Check brand name in Logo
    const brandMatches = [...html.matchAll(/<span[^>]*class="[^"]*brandName[^"]*"[^>]*>([^<]+)<\/span>/gi)];
    console.log('Brand name matches in HTML:', brandMatches.map(m => m[1]));
    
    // Check title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Page Title:', titleMatch ? titleMatch[1] : 'No title');
  } catch (err) {
    console.error('Error fetching homepage:', err.message);
  }
}

verify();
