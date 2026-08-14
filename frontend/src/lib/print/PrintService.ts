import { PrintableItem, PrintMode } from './types';

export class PrintService {
  /**
   * Generates a flat array of PrintableItems based on the selected mode and quantity.
   */
  static generatePrintQueue(
    items: PrintableItem[],
    mode: PrintMode,
    quantity: number
  ): PrintableItem[] {
    const queue: PrintableItem[] = [];

    if (!items || items.length === 0) return queue;

    if (mode === 'perFabric') {
      // Print 'quantity' copies of EACH fabric
      for (const item of items) {
        for (let i = 0; i < quantity; i++) {
          queue.push({ ...item, id: `${item.id}-${i}` }); // ensure unique React keys if needed
        }
      }
    } else if (mode === 'total') {
      // Print EXACTLY 'quantity' labels in total, distributing evenly
      let itemsToDistribute = quantity;
      let currentIndex = 0;
      
      while (itemsToDistribute > 0) {
        const item = items[currentIndex % items.length];
        queue.push({ ...item, id: `${item.id}-${itemsToDistribute}` });
        currentIndex++;
        itemsToDistribute--;
      }
      
      // The user wants grouped labels, not randomly mixed. 
      // The above while-loop alternates them (e.g. A, B, A, B). 
      // To group them: sort by original item order!
      queue.sort((a, b) => {
        const indexA = items.findIndex(i => i.barcodeValue === a.barcodeValue);
        const indexB = items.findIndex(i => i.barcodeValue === b.barcodeValue);
        return indexA - indexB;
      });
    }

    return queue;
  }
}
