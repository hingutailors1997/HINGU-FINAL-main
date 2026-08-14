import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { PrintableItem, LabelType, LayoutPreset } from '../../lib/print/types';

interface LabelRendererProps {
  item: PrintableItem;
  type: LabelType;
  preset: LayoutPreset;
}

export default function LabelRenderer({ item, type, preset }: LabelRendererProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center overflow-hidden bg-white text-black"
      style={{
        width: `${preset.widthMm}mm`,
        height: `${preset.heightMm}mm`,
      }}
    >
      {type === 'barcode' ? (
        <div className="flex flex-col items-center w-full h-full justify-between py-1">
          <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
             <Barcode 
                value={item.barcodeValue} 
                width={1.8}
                height={40}
                fontSize={0}
                margin={0}
                background="#ffffff"
                lineColor="#000000"
                displayValue={false}
              />
          </div>
          <div className="text-center mt-1 w-full px-1">
            <p className="text-[11px] font-bold leading-tight truncate">{item.title}</p>
            <p className="text-[10px] font-mono leading-tight">{item.barcodeValue}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full h-full justify-center p-1">
          <div className="flex-1 flex items-center justify-center mb-1">
             <QRCodeSVG 
                value={item.qrValue} 
                size={preset.widthMm * 3} // approx 3 pixels per mm
                level="H"
                includeMargin={false}
              />
          </div>
          <div className="text-center w-full px-1">
            <p className="text-[10px] font-bold leading-tight truncate">{item.title}</p>
            <p className="text-[9px] font-mono leading-tight">{item.barcodeValue}</p>
          </div>
        </div>
      )}
    </div>
  );
}
