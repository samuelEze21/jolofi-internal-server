import { Controller, Get, Param, Patch, Body, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200 })
  async listUsers() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'player')
  @ApiOperation({ summary: 'Get user by ID (admin or owner)' })
  @ApiResponse({ status: 200 })
  async getUser(@Param('id') id: string, @Request() req: any) {
    // Ownership enforced by RolesGuard, but double-check here for clarity in tests
    if (req.user.role === 'player' && req.user.userId !== id) throw new ForbiddenException();
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'player')
  @ApiOperation({ summary: 'Update user profile (owner or admin)' })
  @ApiResponse({ status: 200 })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
    if (req.user.role === 'player' && req.user.userId !== id) throw new ForbiddenException();
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Soft delete user (admin only)' })
  @ApiResponse({ status: 200 })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { success: true };
  }
}