export interface PrintableItem {
  id: string;
  barcodeValue: string;
  qrValue: string;
  title: string;
  subtitle?: string;
  meta1?: string;
  meta2?: string;
}

export type LabelType = 'barcode' | 'qr';
export type PrintMode = 'perFabric' | 'total';

export interface LayoutPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  columns: number;
  rows: number;
}
