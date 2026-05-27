import http from 'http';

http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("Homepage status code:", res.statusCode);
    const sections = [
      'id="hero"',
      'id="partners"',
      'id="services"',
      'id="tech-stack"',
      'id="portfolio"',
      'id="testimonials"',
      'id="team"',
      'id="faq"',
      'id="contact"',
      'Missing Component'
    ];

    sections.forEach((sec) => {
      const exists = data.includes(sec);
      console.log(`Contains '${sec}': ${exists}`);
    });
  });
}).on('error', (err) => {
  console.error("Error fetching homepage:", err.message);
});
