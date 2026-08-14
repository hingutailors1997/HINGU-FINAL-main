const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

async function renderInvoiceHtml(templateData) {
  const tplPath = path.join(__dirname, '..', 'templates', 'invoice.ejs');
  const tpl = fs.readFileSync(tplPath, 'utf8');
  return ejs.render(tpl, templateData);
}

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' } });
  } finally {
    await browser.close();
  }
}

async function generateInvoicePdf({ invoice, order, customer, company = {} }) {
  const templateData = {
    invoice,
    order,
    customer,
    company: Object.assign({
      name: 'Hingu Tailors',
      addressLine1: '123 Textile Street',
      addressLine2: 'Mumbai, MH 400001',
      phone: '+91-22-1234-5678',
      email: 'billing@hingu-tailors.local',
      gstin: '27ABCDE1234F2Z5'
    }, company),
    generatedAt: new Date()
  };

  const html = await renderInvoiceHtml(templateData);
  return await htmlToPdfBuffer(html);
}

module.exports = {
  generateInvoicePdf
};
