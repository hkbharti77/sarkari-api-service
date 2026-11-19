import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminRole } from '../../auth/schemas/admin-user.schema';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

@ApiTags('Admin — Official Documents & PDF Notices')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER, AdminRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[PUBLISHER, EDITOR, SUPER_ADMIN] Upload official notification PDF bulletin',
    description:
      'Uploads an official recruitment gazette PDF (max 15MB). ' +
      'Performs magic-byte header validation (%PDF) and SHA-256 integrity checksumming. ' +
      'Automatically updates job.officialNoticePdfUrl.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Official notice PDF file (max 15MB)',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    example: 'UPSC-CSE-2026-01',
    description: 'Notification customId or MongoDB ObjectId',
  })
  @ApiResponse({ status: 201, description: 'PDF uploaded and attached to job' })
  @ApiResponse({ status: 400, description: 'Invalid file format, size exceeded, or magic byte failure' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async uploadNoticePdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<Record<string, unknown>> {
    return this.documentsService.uploadJobNoticePdf(
      id,
      file,
      user.email,
      user.role,
    );
  }
}
