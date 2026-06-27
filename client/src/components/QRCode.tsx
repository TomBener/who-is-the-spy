import { useEffect, useState } from 'react';
import QR from 'qrcode';
import clsx from 'clsx';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders `value` to a QR data-URL via the `qrcode` lib, framed like a clearance
 * pass: dark-on-white code (kept dark/light for scanability) on a paper tile
 * with a hairline amber frame.
 */
export default function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QR.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      // Dark-on-light is required for reliable scanning.
      color: { dark: '#0a0a0b', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div
      className={clsx('border border-amber/70 bg-paper p-2', className)}
      style={{ width: size + 20, height: size + 20 }}
      aria-label={value}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          width={size}
          height={size}
          alt="QR code"
          className="h-full w-full"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-noir-800/20" />
      )}
    </div>
  );
}
