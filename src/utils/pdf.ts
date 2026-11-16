import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PublicCertificate } from '../types';
import { fmtDate, formatWorkshopDatePhrase } from './format';
import { WORKSHOP_ASSETS } from './workshopAssets';

function drawDiamond(doc: jsPDF, cx: number, cy: number, r = 1.9): void {
  doc.setFillColor(8, 43, 89);
  doc.triangle(cx, cy - r, cx + r, cy, cx - r, cy, 'F');
  doc.triangle(cx, cy + r, cx + r, cy, cx - r, cy, 'F');
  const ir = r * 0.45;
  doc.setFillColor(255, 255, 255);
  doc.triangle(cx, cy - ir, cx + ir, cy, cx - ir, cy, 'F');
  doc.triangle(cx, cy + ir, cx + ir, cy, cx - ir, cy, 'F');
}

async function generateWorkshopCertificatePdf(
  doc: jsPDF,
  cert: PublicCertificate,
  verifyUrl: string,
  companyName: string
): Promise<void> {
  const w = doc.internal.pageSize.getWidth(); // 297mm
  const h = doc.internal.pageSize.getHeight(); // 210mm

  // Pure crisp white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, 'F');

  // Authentic center watermark behind text (exact Canva 9% fade, 119 x 119 mm)
  doc.addImage(WORKSHOP_ASSETS.watermarkDataUrl, 'PNG', 89, 51.4, 119, 119);

  // Exact Canva sweeping bottom-right wave corner (OBJ 48 Bezier curves clipped by page edge)
  doc.setFillColor(48, 113, 173); // #3071AD
  doc.lines(
    [
      [0, -0.2],
      [40.75, -2.87, 73.72, -36.24, 79.21, -79.01],
      [0, 79.21],
    ],
    220.46,
    220.83,
    [1, 1],
    'F',
    true
  );
  doc.setFillColor(206, 157, 67); // #CE9D43
  doc.lines(
    [
      [32.5, -5.11, 59.5, -21.87, 73.35, -44.37],
      [0, 44.37],
    ],
    226.32,
    220.83,
    [1, 1],
    'F',
    true
  );
  doc.setFillColor(13, 59, 102); // #0D3B66
  doc.lines(
    [
      [31.66, -3.82, 57.96, -16.34, 71.44, -33.15],
      [0, 33.15],
    ],
    228.23,
    220.83,
    [1, 1],
    'F',
    true
  );

  // Top-left Navy Ribbon Bookmark + Authentic 3D Gold Rosette Medal (exact Canva X9 & X10)
  doc.setFillColor(13, 59, 102);
  doc.rect(12.2, 0, 35.8, 57.5, 'F');
  doc.triangle(12.2, 57.5, 48.0, 57.5, 30.1, 77.7, 'F');
  doc.addImage(WORKSHOP_ASSETS.medalDataUrl, 'PNG', 15.8, 18.5, 29.4, 37.3);

  // Top-right geometric L-corner + diamond nodes
  doc.setDrawColor(13, 59, 102);
  doc.setLineWidth(0.85);
  doc.line(221.2, 15.0, 280.9, 15.0);
  doc.line(280.9, 15.0, 280.9, 55.5);
  drawDiamond(doc, 221.2, 15.0, 1.8);
  drawDiamond(doc, 277.8, 15.0, 1.7);
  drawDiamond(doc, 280.9, 18.1, 1.7);
  drawDiamond(doc, 280.9, 55.5, 1.8);

  // Authentic Top-right Stacked Square NEWTRI Logo (exact Canva X28)
  doc.addImage(WORKSHOP_ASSETS.logoSquareDataUrl, 'PNG', 242.0, 17.9, 30.9, 30.9);

  // Main Certificate Heading (#0D3B66)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(13, 59, 102);
  doc.text('CERTIFICATE', w / 2, 43.7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(13, 59, 102);
  doc.text('O F   P A R T I C I P A T I O N', w / 2, 53.4, { align: 'center' });

  // Student Name from Excel (classic regular serif matching Canva Caladea Regular)
  doc.setFont('times', 'normal');
  doc.setFontSize(35);
  doc.setTextColor(13, 59, 102);
  doc.text(cert.studentName, 48.0, 87.0, { maxWidth: 185 });

  // Gold Underline 1
  doc.setDrawColor(206, 157, 67);
  doc.setLineWidth(0.65);
  doc.line(48.0, 93.6, 232.5, 93.6);

  // Workshop Attestation Body Text (from Excel)
  const datePhrase = formatWorkshopDatePhrase(cert.startDate, cert.endDate);
  const bodyLines = [
    `For actively participating in the workshop on ${cert.course} conducted by ${companyName} ${datePhrase}.`,
    'We appreciate their enthusiasm and active participation throughout the workshop.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(13, 59, 102);
  const wrapped = doc.splitTextToSize(bodyLines.join('\n'), 185);
  doc.text(wrapped, 48.0, 106.0, { lineHeightFactor: 1.52 });

  // Bottom-left geometric L-corner + diamond nodes
  doc.setDrawColor(13, 59, 102);
  doc.setLineWidth(0.85);
  doc.line(17.8, 155.6, 17.8, 196.1);
  doc.line(17.8, 196.1, 77.5, 196.1);
  drawDiamond(doc, 17.8, 155.6, 1.8);
  drawDiamond(doc, 17.8, 193.0, 1.7);
  drawDiamond(doc, 20.9, 196.1, 1.7);
  drawDiamond(doc, 77.5, 196.1, 1.8);

  // Dynamic Scannable QR Code (bottom-left exact Canva position)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 360,
    margin: 1,
    color: { dark: '#0D3B66', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
  doc.setFillColor(255, 255, 255);
  doc.rect(25.0, 158.6, 23.2, 23.2, 'F');
  doc.addImage(qrDataUrl, 'PNG', 25.4, 159.0, 22.4, 22.4);

  // Certificate ID & Issued Date next to QR
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(13, 59, 102);
  doc.text('CERTIFICATE ID', 50.7, 165.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(13, 59, 102);
  doc.text(cert.certificateId, 50.7, 171.0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(13, 59, 102);
  doc.text(`Issued: ${fmtDate(cert.issueDate)}`, 50.7, 176.8);

  // Authentic Bottom-center Muted Kanyakumari Seal Stamp (exact Canva 56% cornflower blue, 31.2 x 30.9 mm)
  doc.addImage(WORKSHOP_ASSETS.sealDataUrl, 'PNG', 132.7, 162.7, 31.2, 30.9);

  // Authentic Bottom-right Handwritten Signatory Block (27.7 x 11.1 mm above gold line)
  doc.addImage(WORKSHOP_ASSETS.signatureDataUrl, 'PNG', 205.2, 155.0, 27.7, 11.1);

  doc.setDrawColor(206, 157, 67);
  doc.setLineWidth(0.55);
  doc.line(192.9, 168.1, 246.2, 168.1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(13, 59, 102);
  doc.text('CORPORATE TRAINER &', 219.5, 175.1, { align: 'center' });
  doc.text('PROGRAM LEAD', 219.5, 180.6, { align: 'center' });

  const safeName = cert.studentName.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  doc.save(`${cert.certificateId}_${safeName || 'Workshop_Certificate'}.pdf`);
}

export async function generateCertificatePdf(
  cert: PublicCertificate,
  verifyUrl: string,
  companyName = 'NEWTRI Technologies',
  websiteUrl = 'https://newtritechnologies.com/'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  if (String(cert.certType || '').trim().toLowerCase() === 'workshop') {
    await generateWorkshopCertificatePdf(doc, cert, verifyUrl, companyName);
    return;
  }

  const w = doc.internal.pageSize.getWidth(); // 297mm
  const h = doc.internal.pageSize.getHeight(); // 210mm

  // Ivory parchment background
  doc.setFillColor(253, 252, 248);
  doc.rect(0, 0, w, h, 'F');

  // Outer deep navy frame
  doc.setDrawColor(11, 42, 91);
  doc.setLineWidth(1.6);
  doc.rect(10, 10, w - 20, h - 20);

  // Inner refined gold rule
  doc.setDrawColor(184, 140, 56);
  doc.setLineWidth(0.6);
  doc.rect(14, 14, w - 28, h - 28);

  // Corner geometric accents
  doc.setFillColor(11, 42, 91);
  const corners = [
    [10, 10],
    [w - 16, 10],
    [10, h - 16],
    [w - 16, h - 16],
  ];
  for (const [cx, cy] of corners) {
    doc.rect(cx, cy, 6, 6, 'F');
  }

  // Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(11, 42, 91);
  doc.text(companyName.toUpperCase(), w / 2, 31, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(85, 101, 127);
  doc.text(
    `Karangad, Kanyakumari District, Tamil Nadu  ·  ${websiteUrl.replace(/\/$/, '')}`,
    w / 2,
    37.5,
    { align: 'center' }
  );

  // Thin divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(68, 43, w - 68, 43);

  // Certificate heading
  const heading =
    cert.certType === 'Internship'
      ? 'CERTIFICATE OF INTERNSHIP'
      : cert.certType === 'Value-added'
        ? 'VALUE-ADDED PROGRAMME CERTIFICATE'
        : 'CERTIFICATE OF COMPLETION';

  doc.setFont('times', 'bold');
  doc.setFontSize(25);
  doc.setTextColor(18, 58, 125);
  doc.text(heading, w / 2, 57, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('This is to proudly certify that', w / 2, 70, { align: 'center' });

  // Student Name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(31);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.studentName, w / 2, 86, { align: 'center', maxWidth: 230 });

  // Name underline
  doc.setDrawColor(184, 140, 56);
  doc.setLineWidth(0.5);
  doc.line(78, 90, w - 78, 90);

  // College
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text(`of ${cert.college}`, w / 2, 99, { align: 'center', maxWidth: 230 });

  // Program attestation paragraph
  const typeLabel =
    cert.certType === 'Internship'
      ? 'internship programme'
      : cert.certType === 'Value-added'
        ? 'value-added programme'
        : 'training course';
  const durationClause = cert.duration ? ` (${cert.duration})` : '';
  const bodyText = `has successfully attended and completed the ${typeLabel} in ${cert.course}${durationClause}, conducted by ${companyName} from ${fmtDate(cert.startDate)} to ${fmtDate(cert.endDate)}.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  const splitBody = doc.splitTextToSize(bodyText, 210);
  doc.text(splitBody, w / 2, 113, { align: 'center', lineHeightFactor: 1.55 });

  // QR Code generation
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 360,
    margin: 1,
    color: { dark: '#0B2A5B', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });

  // Footer Zone (y = 148 to 188)
  // Left: Certificate ID & Issue Date
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 42, 91);
  doc.text(`Certificate ID: ${cert.certificateId}`, 26, 162);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(85, 101, 127);
  doc.text(`Issued on: ${fmtDate(cert.issueDate)}`, 26, 168.5);
  doc.text(`Status: ${cert.status === 'approved' ? 'Verified & Active' : cert.status.toUpperCase()}`, 26, 174.5);

  // Center: Scannable QR Verification Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(w / 2 - 20, 143, 40, 40, 2, 2, 'FD');
  doc.addImage(qrDataUrl, 'PNG', w / 2 - 17.5, 145.5, 35, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 42, 91);
  doc.text('SCAN QR TO VERIFY AUTHENTICITY', w / 2, 188.5, { align: 'center' });

  // Right: Authorized Signatory
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.45);
  doc.line(w - 86, 170, w - 26, 170);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', w - 56, 176, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(85, 101, 127);
  doc.text(companyName, w - 56, 181.5, { align: 'center' });

  const safeName = cert.studentName.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  doc.save(`${cert.certificateId}_${safeName || 'Certificate'}.pdf`);
}
