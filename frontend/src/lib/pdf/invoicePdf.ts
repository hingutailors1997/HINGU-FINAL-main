import { fetchSettings } from '../api';
import { getQrBase64, getSignatureBase64 } from './logoLoader';
import { parseAddress } from './pdfUtils';

export const generateInvoicePdf = async (data: any) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const { invoice, order, customer } = data;
  let settings = data.settings;
  if (!settings) {
    try {
      settings = await fetchSettings();
    } catch (e) {
      console.warn('Could not fetch settings', e);
    }
  }

  // Header Brand
  if (data.logoBase64) {
    doc.addImage(data.logoBase64, 'JPEG', 15, 10, 32, 32);
  }
  
  const bName = settings?.businessName || 'HINGU TAILORS';
  const { bAddress1, bAddress2 } = parseAddress(settings);
  const bContact = `${settings?.contactPhone || '8655717013 | 9892074570'} | ${settings?.contactEmail || 'admin@hingutailors.com'}`;

  doc.setFontSize(26);
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text(bName.toUpperCase(), 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(bAddress1, 105, 33, { align: 'center' });
  if (bAddress2) {
    doc.text(bAddress2, 105, 38, { align: 'center' });
    doc.text(bContact, 105, 43, { align: 'center' });
  } else {
    doc.text(bContact, 105, 38, { align: 'center' });
  }

  doc.setLineWidth(0.5);
  doc.line(15, 50, 195, 50);

  // Invoice Details & Customer Info
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  doc.text('INVOICE TO:', 15, 60);
  doc.setFont(undefined, 'bold');
  let dispName = customer?.fullName || customer?.firstName 
    ? (customer.fullName || `${customer.firstName} ${customer.lastName || ''}`).trim() 
    : order?.customerName || 'Customer';
  let phoneStr = customer?.mobile || order?.customerPhone || 'N/A';

  if (order?.companyGroupId) {
    dispName = order.companyGroupId.groupName || order.customerName;
    phoneStr = order.companyGroupId.phone || phoneStr;
  }
  
  doc.text(dispName, 15, 65);
  doc.setFont(undefined, 'normal');
  doc.text(`Mobile: ${phoneStr}`, 15, 70);
  const formatAddress = (addr: any) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    return `${addr.area || addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.pincode || ''}`.trim().replace(/\s+/g, ' ') || 'N/A';
  };

  doc.text(`Address: ${formatAddress(customer?.address)}`, 15, 75);

  const invNo = invoice?.invoiceNumber || order?.invoice?.number || `INV-${order?.orderNumber || '001'}`;
  const invDate = invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : new Date().toLocaleDateString();
  
  doc.text('INVOICE DETAILS', 140, 60);
  doc.setFont(undefined, 'bold');
  doc.text(`Invoice No: ${invNo}`, 140, 65);
  doc.setFont(undefined, 'normal');
  doc.text(`Date: ${invDate}`, 140, 70);

  // Items Table
  const itemsBody = (order?.items || []).map((item: any, index: number) => {
    let garmentDesc = item.garmentType || 'Garment';
    if (item.employeeId?.fullName) {
      garmentDesc += ` (For: ${item.employeeId.fullName})`;
    } else if (item.employeeName) {
      garmentDesc += ` (For: ${item.employeeName})`;
    }
    return [
      index + 1,
      garmentDesc,
      item.quantity || 1,
      `Rs. ${item.unitPrice || 0}`,
      `Rs. ${item.totalPrice || 0}`
    ];
  });

  autoTable(doc, {
    startY: 85,
    head: [['Sr. No.', 'Item Description', 'Qty', 'Rate', 'Amount']],
    body: itemsBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Financial Summary
  doc.setFontSize(10);
  doc.text('Subtotal:', 130, finalY);
  doc.text(`Rs. ${invoice?.subtotal || order?.totalAmount || 0}`, 170, finalY);

  doc.text('Discount:', 130, finalY + 7);
  doc.text(`Rs. ${invoice?.discountAmount || order?.discount || 0}`, 170, finalY + 7);

  doc.setFont(undefined, 'bold');
  doc.text('Grand Total:', 130, finalY + 16);
  doc.text(`Rs. ${invoice?.totalAmount || order?.totalAmount || 0}`, 170, finalY + 16);

  doc.setFont(undefined, 'normal');
  doc.text('Advance Paid:', 130, finalY + 23);
  doc.text(`Rs. ${order?.advancePaid || 0}`, 170, finalY + 23);

  doc.setFont(undefined, 'bold');
  doc.setTextColor(220, 38, 38); // Red for balance
  const balance = order?.balanceAmount || 0;
  doc.text('Remaining Balance:', 130, finalY + 32);
  doc.text(`Rs. ${balance}`, 170, finalY + 32);
  doc.setTextColor(0, 0, 0);

  // Payment Status
  doc.setFontSize(12);
  let status = 'Pending';
  if (balance <= 0) status = 'Paid';
  else if ((order?.advancePaid || 0) > 0) status = 'Partial';
  
  doc.text(`Payment Status: ${status.toUpperCase()}`, 15, finalY);

  // Static UPI QR Code (Only if not paid)
  if (balance > 0) {
    try {
      const qrBase64 = await getQrBase64();
      if (qrBase64) {
        const qrY = 220; // Fixed near bottom left
        
        doc.addImage(qrBase64, 'JPEG', 15, qrY, 35, 35);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('SCAN TO PAY BALANCE', 32.5, qrY + 40, { align: 'center' });
        
        doc.setFont(undefined, 'normal');
        doc.text(`UPI: vivekhingu28-1@oksbi`, 32.5, qrY + 45, { align: 'center' });
      }
    } catch (err) {
      console.warn('Could not load UPI QR Code', err);
    }
  }

  // Footer
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  try {
    const sigBase64 = await getSignatureBase64();
    if (sigBase64) {
      doc.addImage(sigBase64, 'PNG', 145, 245, 40, 20);
    }
  } catch (err) {
    console.warn('Could not load signature', err);
  }

  doc.line(135, 265, 195, 265);
  doc.text('Authorized Signature', 165, 270, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business. Terms & Conditions apply.', 105, 285, { align: 'center' });

  doc.save(`${invNo}.pdf`);
};
