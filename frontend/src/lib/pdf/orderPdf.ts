import { fetchSettings } from '../api';
import { parseAddress } from './pdfUtils';

export const generateOrderDetailsPdf = async (data: any) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const { order, customer } = data;
  const settings = await fetchSettings();

  // Header Brand
  if (data.logoBase64) {
    doc.addImage(data.logoBase64, 'JPEG', 15, 13, 25, 25);
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

  doc.setLineWidth(0.5);
  doc.line(15, 45, 195, 45);

  // Order Information
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('ORDER DETAILS', 15, 55);

  let dispName = customer?.fullName || customer?.firstName 
    ? (customer.fullName || `${customer.firstName} ${customer.lastName || ''}`).trim() 
    : order?.customerName || 'N/A';
  
  if (order?.companyGroupId) {
    dispName = order.companyGroupId.groupName || order.customerName;
  }

  const orderBody = [
    ['Order Number', order?.orderNumber || 'N/A', 'Customer Name', dispName],
    ['Order Date', order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A', 'Assigned Tailor', order?.assignedTailorName || 'N/A'],
    ['Delivery Date', order?.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Pending', 'Current Stage', order?.currentStage || 'N/A']
  ];

  autoTable(doc, {
    startY: 60,
    body: orderBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 40 },
      1: { width: 50 },
      2: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 40 },
      3: { width: 50 }
    }
  });

  // Order Items
  if (order?.items && order.items.length > 0) {
    const itemsBody = order.items.map((item: any, index: number) => {
      let garmentDesc = item.garmentType || 'N/A';
      if (item.employeeId?.fullName) {
        garmentDesc += ` (For: ${item.employeeId.fullName})`;
      } else if (item.employeeName) {
        garmentDesc += ` (For: ${item.employeeName})`;
      }
      return [
        index + 1,
        garmentDesc,
        item.fabricName || 'N/A',
        item.quantity || 1,
        item.measurementVersion ? `V${item.measurementVersion}` : 'N/A',
        `Rs. ${item.unitPrice || 0}`,
        `Rs. ${item.totalPrice || 0}`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Sr. No.', 'Garment', 'Fabric', 'Qty', 'Meas. Version', 'Rate', 'Amount']],
      body: itemsBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }
      }
    });
  }

  // Production Timeline
  if (order?.productionTimeline && order.productionTimeline.length > 0) {
    const timelineBody = order.productionTimeline.map((pt: any) => [
      pt.stage,
      new Date(pt.timestamp).toLocaleString()
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Production Stage', 'Timestamp']],
      body: timelineBody,
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
      styles: { fontSize: 9, cellPadding: 3 }
    });
  }

  // Footer / Signature
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.line(135, 265, 195, 265);
  doc.text('Authorized Signature', 165, 270, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business. Terms & Conditions apply.', 105, 285, { align: 'center' });

  doc.save(`Order_${order?.orderNumber || 'Document'}.pdf`);
};
