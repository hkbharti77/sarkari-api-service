import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AdminUser, AdminUserDocument, AdminRole } from './schemas/admin-user.schema';
import { LoginDto } from './dto/login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AuditService } from './audit/audit.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  // ─── LOGIN ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.adminUserModel
      .findOne({ email: dto.email.toLowerCase() })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update lastLoginAt
    await this.adminUserModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    });

    const payload = {
      sub: (user._id as unknown as string).toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Audit the login
    await this.auditService.createAuditLog({
      actor: user.email,
      role: user.role,
      action: 'ADMIN_LOGIN',
      metadata: { timestamp: new Date().toISOString() },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: new Date(),
      },
    };
  }

  // ─── GET CURRENT USER ───────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.adminUserModel
      .findById(userId)
      .select('-passwordHash')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ─── CREATE ADMIN USER ──────────────────────────────────────────────────────

  async createAdminUser(dto: CreateAdminUserDto, actorEmail: string, actorRole: string) {
    const existing = await this.adminUserModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const newUser = await this.adminUserModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      isActive: true,
    });

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'CREATE_ADMIN_USER',
      referenceId: (newUser._id as unknown as string).toString(),
      metadata: { targetEmail: dto.email, targetRole: dto.role },
    });

    return {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: (newUser as unknown as { createdAt: Date }).createdAt,
    };
  }

  // ─── LIST ADMIN USERS ───────────────────────────────────────────────────────

  async findAllAdminUsers() {
    return this.adminUserModel
      .find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ─── SEED SUPER ADMIN (dev-only) ────────────────────────────────────────────

  async seedSuperAdmin() {
    const existing = await this.adminUserModel.findOne({ role: AdminRole.SUPER_ADMIN });
    if (existing) {
      return { message: 'Super admin already exists', email: existing.email };
    }

    const passwordHash = await bcrypt.hash('Admin@1234', BCRYPT_ROUNDS);

    const superAdmin = await this.adminUserModel.create({
      name: 'Super Administrator',
      email: 'admin@govjob.in',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });

    await this.auditService.createAuditLog({
      actor: 'SYSTEM',
      role: AdminRole.SUPER_ADMIN,
      action: 'SEED_SUPER_ADMIN',
      referenceId: (superAdmin._id as unknown as string).toString(),
      metadata: { email: 'admin@govjob.in' },
    });

    return {
      message: 'Super admin seeded successfully',
      email: superAdmin.email,
      defaultPassword: 'Admin@1234',
      warning: 'Change this password immediately in production!',
    };
  }

  // ─── TOGGLE USER ACTIVE STATE ───────────────────────────────────────────────

  async toggleUserActive(userId: string, actorEmail: string, actorRole: string) {
    const user = await this.adminUserModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot deactivate super admin');
    }

    user.isActive = !user.isActive;
    await user.save();

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: user.isActive ? 'ACTIVATE_ADMIN_USER' : 'DEACTIVATE_ADMIN_USER',
      referenceId: userId,
      metadata: { targetEmail: user.email },
    });

    return { id: user._id, email: user.email, isActive: user.isActive };
  }
}
