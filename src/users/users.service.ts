import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find({ deleted: { $ne: true } }).lean();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).lean();
    if (!user || user.deleted) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: RegisterDto): Promise<User> {
    const user = await this.userModel.create(dto as any);
    return user.toObject();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const update: UpdateQuery<UserDocument> = { $set: dto };
    const user = await this.userModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { $set: { deleted: true } }, { new: true });
    if (!user) throw new NotFoundException('User not found');
  }
}