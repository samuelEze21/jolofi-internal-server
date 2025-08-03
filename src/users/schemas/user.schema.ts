import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  identifier: string; // email or phone

  @Prop({ required: false })
  isVerified: boolean;

  @Prop()
  verificationCode?: string;

  @Prop({default: Date.now})
    createdAt: Date;

    @Prop({default: Date.now})
    updatedAt: Date;

}


export const UserSchema = SchemaFactory.createForClass(User);
