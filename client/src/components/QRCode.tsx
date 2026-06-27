import { useEffect, useState } from 'react';
import QR from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Renders `value` to a QR data-URL via the `qrcode` lib and shows it as an <img>. */
export default function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QR.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1020', light: '#ffffff' },
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
      className={className}
      style={{ width: size, height: size }}
      aria-label={value}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          width={size}
          height={size}
          alt="QR code"
          className="h-full w-full rounded-2xl"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded-2xl bg-white/10" />
      )}
    </div>
  );
}
