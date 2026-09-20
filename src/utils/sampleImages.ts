/**
 * Generates high-fidelity sample portrait photos directly on canvas
 * for 1-click instant demo and testing without local file upload.
 */

export function createSamplePortraitCanvas(gender: 'male' | 'female' = 'male'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 600;
  const h = 800;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Light grayish-blue studio background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#E8EFF7');
  bgGrad.addColorStop(1, '#D8E2ED');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.42;

  // 2. Torso / Clothes (Business Suit & Shirt)
  // Suit jacket
  ctx.fillStyle = gender === 'male' ? '#1E293B' : '#334155';
  ctx.beginPath();
  ctx.moveTo(cx - 190, h);
  ctx.quadraticCurveTo(cx - 160, cy + 150, cx - 75, cy + 140);
  ctx.lineTo(cx, cy + 185);
  ctx.lineTo(cx + 75, cy + 140);
  ctx.quadraticCurveTo(cx + 160, cy + 150, cx + 190, h);
  ctx.closePath();
  ctx.fill();

  // White Shirt Collar
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(cx - 50, cy + 115);
  ctx.lineTo(cx, cy + 165);
  ctx.lineTo(cx + 50, cy + 115);
  ctx.lineTo(cx + 25, cy + 105);
  ctx.lineTo(cx - 25, cy + 105);
  ctx.closePath();
  ctx.fill();

  if (gender === 'male') {
    // Red Tie
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 148);
    ctx.lineTo(cx + 12, cy + 148);
    ctx.lineTo(cx + 16, cy + 240);
    ctx.lineTo(cx, cy + 265);
    ctx.lineTo(cx - 16, cy + 240);
    ctx.closePath();
    ctx.fill();
  }

  // Neck
  ctx.fillStyle = '#F5D0B5';
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy + 60);
  ctx.lineTo(cx - 38, cy + 120);
  ctx.quadraticCurveTo(cx, cy + 135, cx + 38, cy + 120);
  ctx.lineTo(cx + 38, cy + 60);
  ctx.closePath();
  ctx.fill();

  // Neck shadow
  ctx.fillStyle = 'rgba(180, 110, 80, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 72, 36, 12, 0, 0, Math.PI);
  ctx.fill();

  // 3. Face Oval
  ctx.fillStyle = '#FCE3CF';
  ctx.beginPath();
  // Jawline
  ctx.moveTo(cx - 75, cy - 40);
  ctx.bezierCurveTo(cx - 75, cy + 40, cx - 45, cy + 85, cx, cy + 88);
  ctx.bezierCurveTo(cx + 45, cy + 85, cx + 75, cy + 40, cx + 75, cy - 40);
  // Forehead
  ctx.bezierCurveTo(cx + 75, cy - 110, cx - 75, cy - 110, cx - 75, cy - 40);
  ctx.closePath();
  ctx.fill();

  // Soft Cheek blush
  const blushGradL = ctx.createRadialGradient(cx - 45, cy + 10, 2, cx - 45, cy + 10, 32);
  blushGradL.addColorStop(0, 'rgba(244, 114, 114, 0.18)');
  blushGradL.addColorStop(1, 'rgba(244, 114, 114, 0)');
  ctx.fillStyle = blushGradL;
  ctx.beginPath();
  ctx.arc(cx - 45, cy + 10, 32, 0, Math.PI * 2);
  ctx.fill();

  const blushGradR = ctx.createRadialGradient(cx + 45, cy + 10, 2, cx + 45, cy + 10, 32);
  blushGradR.addColorStop(0, 'rgba(244, 114, 114, 0.18)');
  blushGradR.addColorStop(1, 'rgba(244, 114, 114, 0)');
  ctx.fillStyle = blushGradR;
  ctx.beginPath();
  ctx.arc(cx + 45, cy + 10, 32, 0, Math.PI * 2);
  ctx.fill();

  // 4. Hair
  ctx.fillStyle = '#1A1A1A';
  if (gender === 'male') {
    // Clean gentleman cut
    ctx.beginPath();
    ctx.moveTo(cx - 82, cy - 35);
    ctx.quadraticCurveTo(cx - 86, cy - 105, cx - 40, cy - 125);
    ctx.quadraticCurveTo(cx + 20, cy - 135, cx + 80, cy - 110);
    ctx.quadraticCurveTo(cx + 86, cy - 50, cx + 82, cy - 35);
    ctx.quadraticCurveTo(cx + 60, cy - 65, cx, cy - 68);
    ctx.quadraticCurveTo(cx - 55, cy - 65, cx - 82, cy - 35);
    ctx.closePath();
    ctx.fill();

    // Fine hair boundary strands
    ctx.strokeStyle = '#1F1F1F';
    ctx.lineWidth = 1.2;
    for (let i = -30; i <= 60; i += 12) {
      ctx.beginPath();
      ctx.moveTo(cx + i, cy - 125);
      ctx.quadraticCurveTo(cx + i + 4, cy - 132, cx + i + 8, cy - 128);
      ctx.stroke();
    }
  } else {
    // Female elegant shoulder-length hair
    ctx.beginPath();
    ctx.moveTo(cx - 85, cy + 90);
    ctx.quadraticCurveTo(cx - 95, cy - 50, cx - 60, cy - 120);
    ctx.quadraticCurveTo(cx, cy - 135, cx + 60, cy - 120);
    ctx.quadraticCurveTo(cx + 95, cy - 50, cx + 85, cy + 90);
    ctx.quadraticCurveTo(cx + 72, cy - 30, cx + 55, cy - 68);
    ctx.quadraticCurveTo(cx, cy - 72, cx - 55, cy - 68);
    ctx.quadraticCurveTo(cx - 72, cy - 30, cx - 85, cy + 90);
    ctx.closePath();
    ctx.fill();

    // Fine flyaway hair strands
    ctx.strokeStyle = '#1F1F1F';
    ctx.lineWidth = 1.0;
    for (let i = -50; i <= 50; i += 15) {
      ctx.beginPath();
      ctx.moveTo(cx + i, cy - 122);
      ctx.quadraticCurveTo(cx + i + 3, cy - 132, cx + i + 7, cy - 126);
      ctx.stroke();
    }
  }

  // Ears
  ctx.fillStyle = '#F7D4BE';
  ctx.beginPath();
  ctx.ellipse(cx - 76, cy - 2, 8, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 76, cy - 2, 8, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Facial Features
  // Eyebrows
  ctx.strokeStyle = '#262626';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left eyebrow
  ctx.moveTo(cx - 50, cy - 22);
  ctx.quadraticCurveTo(cx - 32, cy - 26, cx - 15, cy - 21);
  // Right eyebrow
  ctx.moveTo(cx + 15, cy - 21);
  ctx.quadraticCurveTo(cx + 32, cy - 26, cx + 50, cy - 22);
  ctx.stroke();

  // Eyes (Almond shape)
  // Eye whites
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cx - 32, cy - 8, 14, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 32, cy - 8, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris (Dark brown)
  ctx.fillStyle = '#2B1A12';
  ctx.beginPath();
  ctx.arc(cx - 32, cy - 8, 6.5, 0, Math.PI * 2);
  ctx.arc(cx + 32, cy - 8, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Pupil & highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 30, cy - 10, 2.2, 0, Math.PI * 2);
  ctx.arc(cx + 34, cy - 10, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyelids
  ctx.strokeStyle = '#332218';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx - 32, cy - 8, 14, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(cx + 32, cy - 8, 14, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = '#D49D7D';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx, cy + 18);
  ctx.lineTo(cx + 8, cy + 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + 22, 5, 0, Math.PI);
  ctx.stroke();

  // Lips (Natural pinkish coral)
  ctx.fillStyle = '#DF7575';
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy + 50);
  ctx.quadraticCurveTo(cx - 10, cy + 46, cx, cy + 49);
  ctx.quadraticCurveTo(cx + 10, cy + 46, cx + 22, cy + 50);
  ctx.quadraticCurveTo(cx + 10, cy + 62, cx, cy + 62);
  ctx.quadraticCurveTo(cx - 10, cy + 62, cx - 22, cy + 50);
  ctx.closePath();
  ctx.fill();

  return canvas;
}
