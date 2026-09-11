import QRCode from "qrcode";

export type BrandedQrMode = "lost" | "care";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR 로고를 불러오지 못했습니다."));
    image.src = src;
  });
}

function fillRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

export async function createBrandedQrDataUrl(url: string, mode: BrandedQrMode) {
  const size = 720;
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    width: size,
    margin: 3,
    errorCorrectionLevel: "H",
    color: { dark: mode === "lost" ? "#4A302A" : "#3F392F", light: "#FFFFFF" },
  });

  const context = canvas.getContext("2d");
  if (!context) throw new Error("QR 이미지를 만들지 못했습니다.");
  const logo = await loadImage("/mynameis-logo-240.png");
  const plateWidth = 142;
  const plateHeight = 102;
  const plateX = (size - plateWidth) / 2;
  const plateY = (size - plateHeight) / 2;

  context.save();
  context.shadowColor = "rgba(63,57,47,.12)";
  context.shadowBlur = 8;
  context.fillStyle = "#fff";
  fillRoundedRect(context, plateX, plateY, plateWidth, plateHeight, 16);
  context.restore();

  const logoWidth = 118;
  const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
  const logoY = size / 2 - 42;
  context.save();
  context.shadowColor = "rgba(255,255,255,.98)";
  context.shadowBlur = 9;
  context.drawImage(logo, (size - logoWidth) / 2, logoY, logoWidth, logoHeight);
  context.restore();

  const badgeText = mode === "lost" ? "실종" : "돌봄";
  context.font = "900 22px Arial, Apple SD Gothic Neo, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = mode === "lost" ? "#A7473E" : "#487548";
  context.fillText(badgeText, size / 2, size / 2 + 31);
  return canvas.toDataURL("image/png", 1);
}
