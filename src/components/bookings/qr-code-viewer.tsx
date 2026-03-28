"use client";

import { useState } from "react";
import { generateQRCode } from "@/lib/qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, Download } from "lucide-react";
import Image from "next/image";

interface QRCodeViewerProps {
  bookingId: string;
  bookingCode: string;
  equipmentName: string;
}

export function QRCodeViewer({
  bookingId,
  bookingCode,
  equipmentName,
}: QRCodeViewerProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    if (qrCodeUrl) return;
    setLoading(true);
    try {
      const url = await generateQRCode(bookingId);
      setQrCodeUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadQR() {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `booking-${bookingCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Dialog onOpenChange={(open) => open && handleOpen()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking QR Code</DialogTitle>
          <DialogDescription>
            Show this code to the PMO Admin during equipment pickup or return.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="relative flex aspect-square w-64 items-center justify-center overflow-hidden rounded-xl border-2 border-fsuu-blue-100 bg-white p-4 shadow-sm">
            {loading ? (
              <Loader2 className="h-10 w-10 animate-spin text-fsuu-blue-600" />
            ) : qrCodeUrl ? (
              <Image
                src={qrCodeUrl}
                alt={`QR Code for ${bookingCode}`}
                width={256}
                height={256}
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-fsuu-blue-800">
              {bookingCode}
            </p>
            <p className="text-xs text-muted-foreground">{equipmentName}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Button
            onClick={downloadQR}
            disabled={!qrCodeUrl}
            className="w-full gap-2"
            variant="fsuu"
          >
            <Download className="h-4 w-4" />
            Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
