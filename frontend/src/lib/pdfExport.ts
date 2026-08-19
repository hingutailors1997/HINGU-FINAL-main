import { getLogoBase64, getSignatureBase64 } from './pdf/logoLoader';
import { fetchSettings } from './api';
import { parseAddress } from './pdf/pdfUtils';

function renderTextToImage(text: string, maxWidth: number = 800): { dataUrl: string, width: number, height: number } | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const font = '16px "Segoe UI", Arial, sans-serif';
    ctx.font = font;
    
    const lines: string[] = [];
    const rawLines = text.split('\n');
    
    rawLines.forEach(rawLine => {
      const words = rawLine.split(' ');
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
    });
    
    const lineHeight = 24;
    canvas.width = maxWidth;
    canvas.height = lines.length * lineHeight + 10;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = font;
    ctx.fillStyle = '#475569';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 0, index * lineHeight + 5);
    });
    
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } catch (err) {
    console.error("Canvas rendering failed", err);
    return null;
  }
}

export const generateDashboardPDF = async (
  orders: any[], 
  transactions: any[], 
  totalSales: number, 
  netProfit: number,
  chartsBase64?: { revenue?: string | null, sales?: string | null, category?: string | null }
) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const settings = await fetchSettings();
  const logoBase64 = await getLogoBase64();
  
  // Header
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 10, 25, 25);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;
  
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text(bName.toUpperCase(), 105, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 25, { align: 'center' });
  if (bAddress2) {
    doc.text(bAddress2, 105, 30, { align: 'center' });
    doc.text(bContact, 105, 35, { align: 'center' });
  } else {
    doc.text(bContact, 105, 30, { align: 'center' });
  }
  
  doc.setLineWidth(0.5);
  doc.line(15, 40, 195, 40);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Executive Dashboard Report', 105, 48, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 54, { align: 'center' });
  
  // Summary Section
  doc.setFontSize(12);
  doc.text(`Total Sales: Rs. ${totalSales.toLocaleString()}`, 14, 65);
  doc.text(`Net Profit: Rs. ${netProfit.toLocaleString()}`, 14, 73);
  doc.text(`Total Orders: ${orders.length}`, 120, 65);
  doc.text(`Total Expenses: Rs. ${transactions.filter((t: any) => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}`, 120, 73);
  
  // Recent Orders Table
  doc.text('Recent Orders', 14, 85);
  
  const orderRows = orders.slice(0, 15).map((o: any) => [
    o.orderNumber,
    new Date(o.createdAt).toLocaleDateString(),
    o.customerName || (o.customerId ? (o.customerId.fullName || `${o.customerId.firstName || ''} ${o.customerId.lastName || ''}`.trim()) : 'Walk-in') || 'Walk-in',
    o.status,
    `Rs. ${o.totalAmount?.toLocaleString() || 0}`
  ]);
  
  autoTable(doc as any, {
    startY: 90,
    head: [['Order No', 'Date', 'Customer', 'Status', 'Amount']],
    body: orderRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }
  });
  
  let finalY = (doc as any).lastAutoTable?.finalY || 100;
  
  if (chartsBase64) {
    if (finalY > 200) {
      doc.addPage();
      finalY = 20;
    }
    
    // Add revenue chart
    if (chartsBase64.revenue) {
      doc.text('Revenue vs Profit Trend', 14, finalY + 15);
      // html2canvas width for col-span-8 is roughly double col-span-4. Let's make it span the page.
      doc.addImage(chartsBase64.revenue, 'PNG', 14, finalY + 20, 180, 80);
      finalY += 105;
    }
    
    if (finalY > 160) {
      doc.addPage();
      finalY = 20;
    }
    
    if (chartsBase64.sales) {
      doc.text('Yearly Sales', 14, finalY + 15);
      doc.addImage(chartsBase64.sales, 'PNG', 14, finalY + 20, 85, 80);
    }
    
    if (chartsBase64.category) {
      doc.text('Sales by Category', 105, finalY + 15);
      doc.addImage(chartsBase64.category, 'PNG', 105, finalY + 20, 85, 80);
    }
  }
  
  // Save the PDF
  doc.save(`Hingu_Dashboard_Report_${new Date().getTime()}.pdf`);
};

export const generateOrderInvoice = async (order: any) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();
  const signatureBase64 = await getSignatureBase64();
  const settings = await fetchSettings();
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 8, 32, 32);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;
  
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text(bName.toUpperCase(), 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 28, { align: 'center' });
  if (bAddress2) {
    doc.text(bAddress2, 105, 33, { align: 'center' });
    doc.text(bContact, 105, 38, { align: 'center' });
  } else {
    doc.text(bContact, 105, 33, { align: 'center' });
  }
  doc.setLineWidth(0.5);
  doc.line(15, 45, 195, 45);
  
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Invoice / Receipt', 105, 53, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Order No: ${order.orderNumber}`, 14, 62);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 69);
  
  if (order.customerId) {
    doc.text(`Customer: ${order.customerId.firstName} ${order.customerId.lastName}`, 120, 62);
    doc.text(`Phone: ${order.customerId.phone || 'N/A'}`, 120, 69);
  }
  
  const itemRows = order.items?.map((item: any, i: number) => [
    i + 1,
    item.garmentType,
    item.quantity,
    `Rs. ${item.price?.toLocaleString() || 0}`,
    `Rs. ${(item.quantity * item.price)?.toLocaleString() || 0}`
  ]) || [];
  
  autoTable(doc as any, {
    startY: 75,
    head: [['#', 'Garment', 'Qty', 'Rate', 'Total']],
    body: itemRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }
  });
  
  const finalY = (doc as any).lastAutoTable?.finalY || 75 + (itemRows.length * 8) + 10;
  
  doc.text(`Total Amount: Rs. ${(order.totalAmount || 0).toLocaleString()}`, 140, finalY + 15);
  doc.text(`Advance Paid: Rs. ${(order.advancePayment || 0).toLocaleString()}`, 140, finalY + 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Balance Due: Rs. ${((order.totalAmount || 0) - (order.advancePayment || 0)).toLocaleString()}`, 140, finalY + 30);
  doc.setFont("helvetica", "normal");
  
  if (signatureBase64) {
    doc.addImage(signatureBase64, 'PNG', 14, finalY + 10, 45, 15);
  }
  doc.setFontSize(10);
  doc.text('Authorized Signatory', 14, finalY + 30);
  doc.line(14, finalY + 26, 60, finalY + 26);
  
  doc.save(`Invoice_${order.orderNumber}.pdf`);
};

export const generateCustomerMeasurementPDF = async (customer: any, measurements: any[], selectedGarment?: string) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();
  const settings = await fetchSettings();
  
  // Header Brand
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 13, 25, 25);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;

  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text(bName.toUpperCase(), 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 28, { align: 'center' });
  if (bAddress2) {
    doc.text(bAddress2, 105, 33, { align: 'center' });
    doc.text(bContact, 105, 38, { align: 'center' });
  } else {
    doc.text(bContact, 105, 33, { align: 'center' });
  }

  // Document Title
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(selectedGarment ? `${selectedGarment} Measurement Specification` : 'Customer 360° Measurement Dossier', 105, 48, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | Master Workstation Report`, 105, 54, { align: 'center' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 58, 196, 58);
  
  // Customer Profile Details
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  const fullName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.fullName || 'Valued Customer' : 'Valued Customer';
  
  if (customer && customer.companyName) {
    doc.text(`Company: ${customer.companyName}`, 14, 66);
    doc.text(`Employee Name: ${fullName}`, 14, 72);
    if (customer.customerId || customer.customerCode || customer._id) {
      doc.text(`Client ID: ${customer.customerId || customer.customerCode || 'N/A'}`, 120, 66);
    }
    if (customer.mobile) {
      doc.text(`Mobile / WhatsApp: ${customer.mobile}`, 120, 72);
    }
  } else {
    doc.text(`Customer Name: ${fullName}`, 14, 66);
    if (customer && (customer.customerId || customer.customerCode || customer._id)) {
      doc.text(`Client ID: ${customer.customerId || customer.customerCode || 'N/A'}`, 120, 66);
    }
    if (customer && customer.mobile) {
      doc.text(`Mobile / WhatsApp: ${customer.mobile}`, 14, 72);
    }
  }
  if (customer && customer.category) {
    doc.text(`Tier / Category: ${customer.category}`, 120, 72);
  }

  let currentY = 82;

  if (!measurements || measurements.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text('No active measurements currently saved for this customer.', 14, currentY);
  } else {
    for (let i = 0; i < measurements.length; i++) {
      const item = measurements[i];
      const gType = item.garmentType || selectedGarment || 'Garment';
      const measMap = item.measurements || {};
      const notes = item.notes || measMap._notes || '';

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text(`Garment Category: ${gType.toUpperCase()}`, 14, currentY);
      currentY += 4;

      const rows: any[] = [];
      Object.entries(measMap).forEach(([key, val]) => {
        if (key === '_notes' || val === undefined || val === '') return;
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const strVal = String(val).trim();
        const hasUnit = /[a-zA-Z]/.test(strVal);
        rows.push([formattedKey, hasUnit ? strVal : `${strVal} in`]);
      });

      if (rows.length > 0) {
        autoTable(doc as any, {
          startY: currentY,
          head: [['Anatomical Parameter / Dimension', 'Recorded Specification']],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 3.5, textColor: [30, 41, 59] },
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentY + (rows.length * 8) + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('No numeric tailoring parameters specified yet for this garment.', 14, currentY + 6);
        currentY += 14;
      }

      if (notes) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        const imgObj = renderTextToImage(`Master Tailor Remarks: ${notes}`, 800);
        if (imgObj) {
          const targetWidth = 180;
          const targetHeight = (imgObj.height / imgObj.width) * targetWidth;
          doc.addImage(imgObj.dataUrl, 'PNG', 14, currentY, targetWidth, targetHeight);
          currentY += targetHeight + 8;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const splitNotes = doc.splitTextToSize(`Master Tailor Remarks: ${notes}`, 180);
          doc.text(splitNotes, 14, currentY);
          currentY += (splitNotes.length * 6) + 8;
        }
      }
      currentY += 8;
    }
  }

  const safeName = (customer && (customer.firstName || customer.fullName)) ? `${customer.firstName || customer.fullName}_${selectedGarment || 'All_Measurements'}`.replace(/\s+/g, '_') : `Measurements_${new Date().getTime()}`;
  doc.save(`${safeName}.pdf`);
};
export const generateAccountsPDF = async (transactions: any[], totalIncome: number, totalExpense: number, netProfit: number, logoBase64?: string) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const settings = await fetchSettings();
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 13, 25, 25);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;
  
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text(bName.toUpperCase(), 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 28, { align: 'center' });
  if (bAddress2) {
    doc.text(bAddress2, 105, 33, { align: 'center' });
    doc.text(bContact, 105, 38, { align: 'center' });
  } else {
    doc.text(bContact, 105, 33, { align: 'center' });
  }
  doc.setLineWidth(0.5);
  doc.line(15, 45, 195, 45);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Accounts & Ledger Report', 105, 55, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 60, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Total Income: Rs. ${totalIncome.toLocaleString()}`, 14, 70);
  doc.text(`Total Expense: Rs. ${totalExpense.toLocaleString()}`, 14, 78);
  doc.text(`Net Profit: Rs. ${netProfit.toLocaleString()}`, 120, 70);
  
  const tableRows = transactions.map((t: any) => [
    new Date(t.date).toLocaleDateString(),
    t.description || '-',
    t.type,
    t.category || '-',
    t.paymentMode || '-',
    `Rs. ${t.amount?.toLocaleString() || 0}`
  ]);
  
  autoTable(doc as any, {
    startY: 85,
    head: [['Date', 'Description', 'Type', 'Category', 'Mode', 'Amount']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] }
  });
  
  doc.save(`Hingu_Accounts_Report_${new Date().getTime()}.pdf`);
};

export const generateTransactionReceiptPDF = async (transaction: any, logoBase64?: string) => {
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ format: 'a5', orientation: 'landscape' });
  const settings = await fetchSettings();
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 15, 13, 20, 20);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;
  
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text(bName.toUpperCase(), 105, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 27, { align: 'center' });
  if (bAddress2) doc.text(bAddress2, 105, 32, { align: 'center' });
  doc.text(bContact, 105, bAddress2 ? 37 : 32, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(15, 42, 195, 42);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const isIncome = transaction.type === 'Income';
  doc.text(isIncome ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER', 105, 52, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text(`Voucher No: ${transaction.transactionNumber || transaction._id?.substring(0, 8)}`, 15, 65);
  doc.text(`Date: ${new Date(transaction.date || transaction.createdAt).toLocaleDateString()}`, 140, 65);
  
  doc.text(`Category: ${transaction.category || '-'}`, 15, 75);
  doc.text(`Payment Mode: ${transaction.paymentMethod || '-'}`, 140, 75);
  
  doc.text(`Amount: Rs. ${Number(transaction.amount || 0).toLocaleString()}`, 15, 85);
  if (transaction.referenceId || transaction.orderRef) {
    doc.text(`Reference: ${transaction.referenceId || (transaction.orderRef?.orderNumber) || '-'}`, 140, 85);
  }
  
  doc.text(`Description:`, 15, 95);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(transaction.description || '-', 15, 102, { maxWidth: 180 });
  
  doc.setLineWidth(0.2);
  doc.line(15, 125, 195, 125);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('This is an electronically generated voucher.', 105, 132, { align: 'center' });
  
  doc.save(`Voucher_${transaction.transactionNumber || transaction._id?.substring(0, 8)}.pdf`);
};

