const { parentPort } = require('worker_threads');
const pdfParse = require('pdf-parse');
const fs = require('fs');

parentPort.on('message', async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pages = [];

    const parsed = await pdfParse(dataBuffer, {
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
    });

    parentPort.postMessage({
      ok: true,
      numpages: parsed.numpages || pages.length || 1,
      text: parsed.text || '',
      pages: pages
    });
  } catch (err) {
    parentPort.postMessage({
      ok: false,
      error: err.message
    });
  }
});
