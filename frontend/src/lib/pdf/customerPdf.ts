import { fetchSettings } from '../api';
import { parseAddress } from './pdfUtils';

export const generateCustomerDetailsPdf = async (data: any) => {
  const { default: jsPDF } = await import('jspdf');
  const autoTableImport = await import('jspdf-autotable');
  const autoTable = autoTableImport.default || (autoTableImport as any).autoTable || autoTableImport;
  
  const doc = new jsPDF();
  const { customer, garments } = data;
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

  // Customer Information
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('CUSTOMER PROFILE', 15, 55);

  const dispName = customer?.fullName || customer?.firstName 
    ? (customer.fullName || `${customer.firstName} ${customer.lastName || ''}`).trim() 
    : 'N/A';

  const formatAddress = (addr: any) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    return `${addr.area || addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.pincode || ''}`.trim().replace(/\s+/g, ' ') || 'N/A';
  };

  const profileBody = [
    ['Customer ID', customer?.customerId || 'N/A', 'Name', dispName],
    ['Mobile', customer?.mobile || 'N/A', 'WhatsApp', customer?.whatsapp || 'N/A'],
    ['Email', customer?.email || 'N/A', 'Gender', customer?.gender || 'N/A'],
    ['Customer Since', customer?.customerSince ? new Date(customer.customerSince).toLocaleDateString() : 'N/A', 'Last Visit', customer?.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'N/A'],
    ['Address', formatAddress(customer?.address), 'Notes', customer?.notes || 'N/A']
  ];

  autoTable(doc, {
    startY: 60,
    margin: { right: customer?.imageUrl ? 60 : 15 },
    body: profileBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 'wrap' },
      1: { cellWidth: 'auto' },
      2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 'wrap' },
      3: { cellWidth: 'auto' }
    }
  });

  if (customer?.imageUrl) {
    try {
      const response = await fetch(customer.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onloadend = () => {
          doc.addImage(reader.result as string, 'JPEG', 150, 60, 40, 40);
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not load customer image', err);
    }
  }

  // Preferences
  if (customer?.preferences) {
    const prefsBody = [
      ['Preferred Fit', customer.preferences.preferredFit || 'N/A'],
      ['Preferred Fabric', customer.preferences.preferredFabric || 'N/A'],
      ['Preferred Tailor', customer.preferences.preferredTailor || 'N/A'],
      ['Special Instructions', customer.preferences.specialInstructions || 'N/A']
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Customer Preferences', 'Details']],
      body: prefsBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 60 }
      }
    });
  }

  const saveName = customer?.fullName || customer?.firstName || 'User';
  doc.save(`Customer_Profile_${saveName}.pdf`);
};
