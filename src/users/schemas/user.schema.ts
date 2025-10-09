import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  identifier: string; // Can be email or phone

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationCode?: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ required: false, trim: true, unique: true, sparse: true })
  username?: string;

  @Prop()
  suiWalletAddress?: string;

  @Prop({ required: false })
  firebaseUid?: string;

  @Prop({ required: false, lowercase: true, trim: true })
  email?: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, enum: ['admin', 'player'], default: 'player' })
  role?: 'admin' | 'player';

  @Prop({ required: false, default: false })
  profileComplete?: boolean;

  @Prop({ required: false, default: false })
  deleted?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
