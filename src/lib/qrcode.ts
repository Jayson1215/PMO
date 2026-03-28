import QRCode from 'qrcode';

/**
 * Generates a Base64 data URL for a QR code
 * @param text The string to encode in the QR code (usually the booking ID or code)
 * @returns Promise<string> Data URL
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1e3a5f', // fsuu-blue-800
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('QR Code generation error:', err);
    throw new Error('Failed to generate QR code');
  }
}
