import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret && apiKey !== 'mock') {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary storage initialized.');
    } else {
      this.logger.log('Cloudinary running in simulated storage mode.');
    }
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'aura-edinburgh'): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WEBP, AVIF)');
    }

    if (this.isConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              this.logger.error(`Cloudinary error: ${error?.message}`);
              return reject(new BadRequestException('Failed to upload image to Cloudinary'));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    }

    // Local simulation fallback
    const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      url: `https://images.unsplash.com/photo-1612204078213-a227dba74093?auto=format&fit=crop&w=1200&q=85`,
      publicId: simulatedId,
    };
  }

  async deleteImage(publicId: string): Promise<boolean> {
    if (this.isConfigured && publicId && !publicId.startsWith('sim_')) {
      try {
        await cloudinary.uploader.destroy(publicId);
        return true;
      } catch (err) {
        this.logger.error(`Failed to delete Cloudinary asset: ${(err as Error).message}`);
        return false;
      }
    }
    return true;
  }
}
