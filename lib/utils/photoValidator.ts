export interface PhotoQuality {
  score: 'good' | 'fair' | 'poor';
  brightness: number;
  blurScore: number;
  suggestions: string[];
}

export async function validatePhoto(file: File): Promise<PhotoQuality> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({
          score: 'fair',
          brightness: 128,
          blurScore: 0,
          suggestions: ['Could not analyze image quality'],
        });
        return;
      }

      // Set canvas size (scale down for performance)
      const maxDim = 800;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const brightness = calculateBrightness(imageData);
        const blurScore = detectBlur(imageData);

        const suggestions: string[] = [];
        let score: 'good' | 'fair' | 'poor' = 'good';

        // Brightness checks
        if (brightness < 60) {
          suggestions.push('Image is too dark - try better lighting');
          score = 'poor';
        } else if (brightness < 80) {
          suggestions.push('Image could be brighter');
          score = score === 'good' ? 'fair' : score;
        } else if (brightness > 220) {
          suggestions.push('Image is overexposed - reduce lighting');
          score = 'fair';
        }

        // Blur checks
        if (blurScore > 150) {
          suggestions.push('Image appears blurry - hold camera steady');
          score = 'poor';
        } else if (blurScore > 100) {
          suggestions.push('Image might be slightly blurry');
          score = score === 'good' ? 'fair' : score;
        }

        // Size checks
        if (img.width < 800 || img.height < 600) {
          suggestions.push('Image resolution is low - use a better camera');
          score = score === 'good' ? 'fair' : score;
        }

        if (suggestions.length === 0) {
          suggestions.push('Great photo quality!');
        }

        resolve({
          score,
          brightness,
          blurScore,
          suggestions,
        });
      } catch (error) {
        resolve({
          score: 'fair',
          brightness: 128,
          blurScore: 0,
          suggestions: ['Quality check unavailable'],
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        score: 'poor',
        brightness: 0,
        blurScore: 0,
        suggestions: ['Failed to load image'],
      });
    };

    img.src = url;
  });
}

function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Calculate perceived brightness
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return sum / (data.length / 16);
}

function detectBlur(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let sum = 0;
  let count = 0;

  // Simple edge detection using Sobel operator (simplified)
  for (let y = 1; y < height - 1; y += 4) {
    for (let x = 1; x < width - 1; x += 4) {
      const idx = (y * width + x) * 4;
      const gx = Math.abs(
        -data[idx - 4] + data[idx + 4] +
        -2 * data[idx - width * 4] + 2 * data[idx + width * 4] +
        -data[idx - width * 4 - 4] + data[idx - width * 4 + 4]
      );
      sum += gx;
      count++;
    }
  }

  // Higher score = more edges = less blur
  return sum / count;
}

export function getQualityColor(score: 'good' | 'fair' | 'poor'): string {
  switch (score) {
    case 'good':
      return 'text-success bg-success/10';
    case 'fair':
      return 'text-warning bg-warning/10';
    case 'poor':
      return 'text-error bg-error/10';
  }
}

export function getQualityLabel(score: 'good' | 'fair' | 'poor'): string {
  switch (score) {
    case 'good':
      return 'Good Quality';
    case 'fair':
      return 'Fair Quality';
    case 'poor':
      return 'Poor Quality';
  }
}

