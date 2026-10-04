import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export type UploadedCover = { secureUrl: string; publicId: string };

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  uploadCover(buffer: Buffer): Promise<UploadedCover> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'book-lending/covers', resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
        (error, result) => {
          if (error || !result) return reject(new BadGatewayException('Cover storage is unavailable.'));
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }
}
