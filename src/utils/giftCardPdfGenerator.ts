export interface ThreePartGiftCardPdfOptions {
  songTitle: string;
  recipientName: string;
  artistPersona: "haddi" | "yosia";
  greetingStatement: string;
  lyrics: string;
  shareableSongUrl: string;
  directAudioLink: string;
  directNarrationLink?: string | null;
  qrSvgElement?: SVGSVGElement | null;
  artistImageElement?: HTMLImageElement | null;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const rawPara of paragraphs) {
    const para = rawPara.trim();
    if (!para) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

async function svgElementToImage(svgEl: SVGSVGElement): Promise<HTMLImageElement | null> {
  try {
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);
    if (!svgString.includes("xmlns=")) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = window.atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function escapePdfString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Wraps a JPEG byte array (and dimensions) into a valid single-page PDF 1.4 document
 * with clickable URI link annotations over the Part 3 QR code & direct audio links.
 */
function buildPdfFromJpegBytes(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number,
  songLink: string,
  audioLink: string
): Blob {
  // Standard US Letter / A4 portrait points (612 x 864 pt)
  const pageW = 612;
  const pageH = 864;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // 1-indexed PDF object byte offsets
  let currentOffset = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    currentOffset += b.byteLength;
  };

  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    currentOffset += b.byteLength;
  };

  const startObj = (id: number) => {
    offsets[id] = currentOffset;
    pushStr(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushStr(`\nendobj\n`);
  };

  pushStr("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  // 1: Catalog
  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  // 2: Pages
  startObj(2);
  pushStr("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  endObj();

  // 3: Page (with clickable link annotations in Part 3 at bottom of page)
  startObj(3);
  pushStr(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> ` +
      `/Contents 5 0 R /Annots [6 0 R 7 0 R] >>`
  );
  endObj();

  // 4: Image XObject (DCTDecode JPEG)
  startObj(4);
  pushStr(
    `<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr("\nendstream");
  endObj();

  // 5: Page Content Stream
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj(5);
  pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`);
  endObj();

  // 6: Clickable Link Annotation for Song Card URL & QR Code (Part 3 upper area)
  const safeSongUrl = escapePdfString(songLink);
  startObj(6);
  pushStr(
    `<< /Type /Annot /Subtype /Link /Rect [36 115 576 235] /Border [0 0 0] ` +
      `/A << /Type /Action /S /URI /URI (${safeSongUrl}) >> >>`
  );
  endObj();

  // 7: Clickable Link Annotation for Direct Audio MP3 URL (Part 3 lower area)
  const safeAudioUrl = escapePdfString(audioLink);
  startObj(7);
  pushStr(
    `<< /Type /Annot /Subtype /Link /Rect [36 40 576 114] /Border [0 0 0] ` +
      `/A << /Type /Action /S /URI /URI (${safeAudioUrl}) >> >>`
  );
  endObj();

  // XRef table
  const xrefOffset = currentOffset;
  const objCount = 8;
  pushStr(`xref\n0 ${objCount}\n`);
  pushStr("0000000000 65535 f \n");
  for (let i = 1; i < objCount; i++) {
    const padded = String(offsets[i] || 0).padStart(10, "0");
    pushStr(`${padded} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return new Blob(chunks, { type: "application/pdf" });
}

/**
 * Generates and downloads a real, printable 3-Part Gift Card PDF file (.pdf)
 * containing:
 *   Part 1: Celebration Header, Artist Portrait (Yosia/Haddi), & Concise Greeting Statement
 *   Part 2: Personalized Celebration Song Lyrics
 *   Part 3: High-Contrast Scannable QR Code & Direct Clickable Audio/Video Links
 */
export async function generateAndDownloadThreePartGiftCardPdf(
  opts: ThreePartGiftCardPdfOptions
): Promise<Blob> {
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas for PDF generation.");
  }

  // Page Background
  ctx.fillStyle = "#fcfaf5";
  ctx.fillRect(0, 0, W, H);

  // Outer Ornamental Frame
  ctx.strokeStyle = "#115e59";
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, W - 76, H - 76);

  const speakerName = opts.artistPersona === "yosia" ? "Yosia" : "Haddi";
  const speakerTitle =
    opts.artistPersona === "yosia"
      ? "Yosia (Haddi's Little Brother) • Acoustic Guitar & Vocals"
      : "Haddi the Street Minstrel • Acoustic Guitar & Vocals";

  // =========================================================================
  // PART 1 OF 3: CELEBRATION GIFT CARD COVER & PERSONAL STATEMENT (y: 56..510)
  // =========================================================================
  const p1X = 56;
  const p1Y = 56;
  const p1W = W - 112;
  const p1H = 445;

  const p1Grad = ctx.createLinearGradient(p1X, p1Y, p1X, p1Y + p1H);
  p1Grad.addColorStop(0, "#fffdf7");
  p1Grad.addColorStop(1, "#f0fdfa");
  ctx.fillStyle = p1Grad;
  ctx.beginPath();
  ctx.roundRect(p1X, p1Y, p1W, p1H, 22);
  ctx.fill();
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Top Seal Pill
  ctx.fillStyle = "#134e4a";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 310, p1Y + 20, 620, 36, 18);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 17px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    "PART 1 OF 3 • OFFICIAL CELEBRATION GIFT CARD • MYGIFTSONG.ORG",
    W / 2,
    p1Y + 44
  );

  // Artist Portrait on Left of Part 1 (if loaded) + Title/Dedication Center
  const hasPortrait = Boolean(
    opts.artistImageElement &&
      opts.artistImageElement.complete &&
      opts.artistImageElement.naturalWidth > 0
  );

  if (hasPortrait && opts.artistImageElement) {
    const img = opts.artistImageElement;
    const avatarX = p1X + 42;
    const avatarY = p1Y + 84;
    const avatarSize = 190;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 20);
    ctx.closePath();
    ctx.clip();
    const scale = Math.max(avatarSize / img.naturalWidth, avatarSize / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(
      img,
      avatarX + (avatarSize - dw) / 2,
      avatarY + (avatarSize - dh) / 2,
      dw,
      dh
    );
    ctx.restore();

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 20);
    ctx.stroke();
  }

  const textCenterX = hasPortrait ? p1X + 260 + (p1W - 280) / 2 : W / 2;

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 36px Georgia, serif";
  ctx.textAlign = "center";
  const titleLines = wrapCanvasText(ctx, opts.songTitle || "Custom Celebration Song", hasPortrait ? p1W - 310 : p1W - 80);
  titleLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, textCenterX, p1Y + 120 + idx * 42);
  });

  const afterTitleY = p1Y + 120 + Math.min(2, titleLines.length) * 42 + 12;
  ctx.fillStyle = "#0f766e";
  ctx.font = "bold 25px sans-serif";
  ctx.fillText(
    `Presented with Love & Celebration To: ${opts.recipientName}`,
    textCenterX,
    afterTitleY
  );

  ctx.fillStyle = "#475569";
  ctx.font = "600 19px sans-serif";
  ctx.fillText(`Performed by ${speakerTitle}`, textCenterX, afterTitleY + 34);

  // Celebration Statement Banner inside Part 1
  const quoteBoxX = p1X + 36;
  const quoteBoxY = p1Y + 305;
  const quoteBoxW = p1W - 72;
  const quoteBoxH = 112;

  ctx.fillStyle = "#fffbeb";
  ctx.beginPath();
  ctx.roundRect(quoteBoxX, quoteBoxY, quoteBoxW, quoteBoxH, 16);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#92400e";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${speakerName.toUpperCase()}'S CELEBRATION GREETING STATEMENT:`,
    W / 2,
    quoteBoxY + 34
  );

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold italic 26px Georgia, serif";
  const cleanGreeting =
    opts.greetingStatement.trim() || `Enjoy your celebration song, ${opts.recipientName}!`;
  const greetingWrapped = wrapCanvasText(ctx, `"${cleanGreeting}"`, quoteBoxW - 50);
  greetingWrapped.slice(0, 2).forEach((gLine, idx) => {
    ctx.fillText(gLine, W / 2, quoteBoxY + 74 + idx * 30);
  });

  // Dashed Fold Line 1 -> 2
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 522);
  ctx.lineTo(W - 56, 522);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("✂ / FOLD LINE • PART 2 BELOW", W / 2, 517);

  // =========================================================================
  // PART 2 OF 3: PERSONALIZED CELEBRATION SONG LYRICS SHEET (y: 540..1215)
  // =========================================================================
  const p2X = 56;
  const p2Y = 540;
  const p2W = W - 112;
  const p2H = 665;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(p2X, p2Y, p2W, p2H, 22);
  ctx.fill();
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Part 2 Header Pill
  ctx.fillStyle = "#0f766e";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 290, p2Y + 18, 580, 34, 17);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `PART 2 OF 3 • CUSTOM SONG LYRICS FOR ${opts.recipientName.toUpperCase()}`,
    W / 2,
    p2Y + 41
  );

  ctx.fillStyle = "#1e293b";
  ctx.font = "italic 21px Georgia, serif";
  ctx.textAlign = "center";

  const rawLyricLines = wrapCanvasText(ctx, opts.lyrics || "", p2W - 96);
  const maxLines = 20;
  const displayLines = rawLyricLines.slice(0, maxLines);
  const lineSpacing = displayLines.length > 15 ? 27 : 30;
  let lyricY = p2Y + 86;

  for (const line of displayLines) {
    if (!line) {
      lyricY += 14;
      continue;
    }
    ctx.fillText(line, W / 2, lyricY);
    lyricY += lineSpacing;
  }

  // Dashed Fold Line 2 -> 3
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 1228);
  ctx.lineTo(W - 56, 1228);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("✂ / FOLD LINE • PART 3 BELOW", W / 2, 1223);

  // =========================================================================
  // PART 3 OF 3: SCAN-TO-PLAY QR CODE & DIRECT AUDIO LINKS (y: 1245..1685)
  // =========================================================================
  const p3X = 56;
  const p3Y = 1245;
  const p3W = W - 112;
  const p3H = 440;

  ctx.fillStyle = "#f0fdfa";
  ctx.beginPath();
  ctx.roundRect(p3X, p3Y, p3W, p3H, 22);
  ctx.fill();
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Part 3 Header Pill
  ctx.fillStyle = "#134e4a";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 330, p3Y + 18, 660, 34, 17);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    "PART 3 OF 3 • SCAN QR CODE OR CLICK LINKS TO PLAY SONG & VIDEO",
    W / 2,
    p3Y + 41
  );

  // Draw QR Code Box on Left of Part 3
  const qrBoxX = p3X + 36;
  const qrBoxY = p3Y + 72;
  const qrBoxSize = 280;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 4;
  ctx.stroke();

  if (opts.qrSvgElement) {
    const qrImg = await svgElementToImage(opts.qrSvgElement);
    if (qrImg) {
      ctx.drawImage(qrImg, qrBoxX + 22, qrBoxY + 16, qrBoxSize - 44, qrBoxSize - 56);
    }
  }

  ctx.fillStyle = "#0f766e";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SCAN WITH PHONE CAMERA", qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize - 16);

  // Direct Links Column on Right of Part 3
  const linksX = qrBoxX + qrBoxSize + 32;
  const linksW = p3W - (qrBoxSize + 104);

  const drawLinkBox = (yOffset: number, label: string, urlText: string) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(linksX, yOffset, linksW, 86, 14);
    ctx.fill();
    ctx.strokeStyle = "#99f6e4";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0f766e";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, linksX + 18, yOffset + 30);

    ctx.fillStyle = "#0369a1";
    ctx.font = "16px monospace";
    const clippedUrl =
      urlText.length > 58 ? urlText.slice(0, 56) + "..." : urlText;
    ctx.fillText(clippedUrl, linksX + 18, yOffset + 62);
  };

  drawLinkBox(
    p3Y + 72,
    "1. Dedicated Song & Video Card Page (Click or Scan QR):",
    opts.shareableSongUrl
  );
  drawLinkBox(
    p3Y + 172,
    "2. Direct Full Singing Song Audio Link (MP3):",
    opts.directAudioLink
  );
  drawLinkBox(
    p3Y + 272,
    "3. Spoken Celebration Greeting Audio / Website:",
    opts.directNarrationLink || "https://www.mygiftsong.org"
  );

  // Footer Line inside Part 3
  ctx.fillStyle = "#475569";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    "WWW.MYGIFTSONG.ORG • OFFICIAL 3-PART CELEBRATION GIFT SONG CARD",
    W / 2,
    p3Y + p3H - 22
  );

  // Convert Canvas to JPEG bytes and wrap inside PDF 1.4
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.94);
  const commaIdx = jpegDataUrl.indexOf(",");
  const jpegBytes = base64ToUint8Array(jpegDataUrl.slice(commaIdx + 1));

  const pdfBlob = buildPdfFromJpegBytes(
    jpegBytes,
    W,
    H,
    opts.shareableSongUrl,
    opts.directAudioLink
  );

  const safeRecipient = (opts.recipientName || "Celebration")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_");
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${safeRecipient}_3Part_Gift_Song_Card.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

  return pdfBlob;
}
