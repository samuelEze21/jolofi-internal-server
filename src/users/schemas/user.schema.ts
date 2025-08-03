import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class User {
  @Prop({ required: true, unique: true })
  identifier: string; // Can be email or phone

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationCode?: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ required: false, unique: true })
  username?: string;

  @Prop()
  suiWalletAddress?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
