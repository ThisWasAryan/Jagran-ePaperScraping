async function run() {
  const url = `https://epaper.jagran.com/epaper/up-all-editions-epaper.html`;
  const response = await fetch(url);
  const html = await response.text();
  const regex = /'edition-(?:today|\d{4}-\d{2}-\d{2})-(\d+)-([^']+)\.html'/g;
  let match;
  let count = 0;
  while ((match = regex.exec(html)) !== null) {
      console.log("Found:", match[1], match[2]);
      count++;
  }
  console.log("Total found:", count);
}
run();
