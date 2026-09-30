import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 1. Configure workspace upload folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'C:\\Gina_AI\\workspace\\uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `src-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

interface TransparencyPayload {
  targetR: string;
  targetG: string;
  targetB: string;
  tolerance: string;
}

// 2. Process background removal request
router.post('/remove-background', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded.' });
      return;
    }

    const { targetR, targetG, targetB, tolerance } = req.body as unknown as TransparencyPayload;
    
    const rMatch = parseInt(targetR || '255', 10);
    const gMatch = parseInt(targetG || '255', 10);
    const bMatch = parseInt(targetB || '255', 10);
    const tol = parseInt(tolerance || '30', 10);

    const inputPath = req.file.path;
    const outputPath = path.join(
      'C:\\Gina_AI\\workspace\\outputs',
      `transparent-${Date.now()}.png`
    );

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    // 3. Process pixel buffer alpha opacity manipulation
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not parse image dimensions.');
    }

    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const colorDistance = Math.sqrt(
        Math.pow(r - rMatch, 2) +
        Math.pow(g - gMatch, 2) +
        Math.pow(b - bMatch, 2)
      );

      if (colorDistance <= tol) {
        data[i + 3] = 0; // Pure transparent alpha channel
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);

    // Clean temporary upload
    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      message: 'Background cleared successfully.',
      outputPath: outputPath,
      dimensions: `${info.width}x${info.height}`
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Pipeline processing failed.' });
  }
});

export default router;
