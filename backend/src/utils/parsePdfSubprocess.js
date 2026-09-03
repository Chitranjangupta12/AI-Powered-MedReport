const fs = require('fs');
const pdfParse = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
  console.error(JSON.stringify({ ok: false, error: 'No file path provided' }));
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);
const pages = [];

pdfParse(dataBuffer, {
  pagerender: (pageData) => {
    return pageData.getTextContent().then(tc => {
      let lastY = null;
      let pageText = '';
      for (const item of tc.items) {
        if (lastY === item.transform[5] || lastY === null) {
          pageText += ' ' + item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      pageText = pageText.trim();

      pages.push({
        page_number: pageData.pageIndex + 1,
        text_content: pageText,
        char_count: pageText.length,
        has_digital_text: pageText.length >= 50,
        items_count: tc.items.length
      });
      return pageText;
    });
  }
}).then(parsed => {
  console.log(JSON.stringify({
    ok: true,
    numpages: parsed.numpages || pages.length || 1,
    text: parsed.text || '',
    pages: pages,
    info: parsed.info || {}
  }));
}).catch(err => {
  // Fallback: Try simple pdf-parse without custom pagerender
  pdfParse(dataBuffer).then(parsed => {
    console.log(JSON.stringify({
      ok: true,
      numpages: parsed.numpages || 1,
      text: parsed.text || '',
      pages: [{
        page_number: 1,
        text_content: parsed.text || '',
        char_count: (parsed.text || '').length,
        has_digital_text: (parsed.text || '').length >= 50,
        items_count: 1
      }],
      info: parsed.info || {}
    }));
  }).catch(fallbackErr => {
    console.log(JSON.stringify({
      ok: false,
      error: fallbackErr.message
    }));
  });
});
