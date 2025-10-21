import Compressor from 'compressorjs';

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  mimeType?: string;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    quality = 0.8,
    maxWidth = 1200,
    maxHeight = 1200,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality,
      maxWidth,
      maxHeight,
      mimeType,
      success(result) {
        const compressedFile = new File(
          [result],
          file.name.replace(/\.\w+$/, '.jpg'),
          { type: mimeType }
        );
        resolve(compressedFile);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round((1 - compressedSize / originalSize) * 100);
}

