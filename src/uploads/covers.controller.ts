import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CloudinaryService, UploadedCover } from './cloudinary.service';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('uploads')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class CoversController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('covers')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => callback(null, imageMimeTypes.has(file.mimetype)),
  }))
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<UploadedCover> {
    if (!file) throw new BadRequestException('Upload a JPEG, PNG, or WebP image up to 5 MB.');
    return this.cloudinary.uploadCover(file.buffer);
  }
}
