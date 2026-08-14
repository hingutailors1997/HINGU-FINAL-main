import { LayoutPreset } from './types';

export class LayoutEngine {
  /**
   * Calculates the maximum number of labels that can fit on a page.
   * A4 is 210mm x 297mm.
   */
  static calculateLayout(
    paperWidthMm: number,
    paperHeightMm: number,
    marginMm: number,
    labelWidthMm: number,
    labelHeightMm: number,
    gapMm: number = 4
  ): LayoutPreset {
    const usableWidth = paperWidthMm - (marginMm * 2);
    const usableHeight = paperHeightMm - (marginMm * 2);

    let columns = Math.floor((usableWidth + gapMm) / (labelWidthMm + gapMm));
    let rows = Math.floor((usableHeight + gapMm) / (labelHeightMm + gapMm));

    if (columns < 1) columns = 1;
    if (rows < 1) rows = 1;

    return {
      id: `dynamic-${labelWidthMm}x${labelHeightMm}`,
      name: `Dynamic ${labelWidthMm}x${labelHeightMm}mm`,
      widthMm: labelWidthMm,
      heightMm: labelHeightMm,
      columns,
      rows
    };
  }

  static getPreset(type: 'barcode' | 'qr'): LayoutPreset {
    if (type === 'barcode') {
      // 64mm width perfectly fits 3 columns (64*3 + 4*2 = 200) inside a 210mm wide A4 sheet with 5mm margins.
      return this.calculateLayout(210, 297, 5, 64, 25, 4); 
    } else {
      // 38mm width perfectly fits 4 columns inside a 210mm wide A4 sheet.
      return this.calculateLayout(210, 297, 5, 38, 48, 4);
    }
  }

  static getLabelsPerPage(preset: LayoutPreset): number {
    return preset.columns * preset.rows;
  }
}
