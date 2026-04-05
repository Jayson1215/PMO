/**
 * QR CODE UTILITY (qrcode.ts)
 * --------------------------
 * Functionality: Converts text or links into scan-able icons (QR Codes).
 * Connection: Used in 'auth.ts' for 2FA setup and potentially for scanning bookings.
 */
import QRCode from 'qrcode';

/**
 * GENERATE QR CODE
 * Functionality: Takes a string and returns a Base64 image that can be displayed in UI.
 * Connection: Connects to the 'qrcode' library for high-quality image generation.
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
