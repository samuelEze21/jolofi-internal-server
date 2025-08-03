// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { User, UserSchema } from '../users/schemas/user.schema';
// import { JwtModule } from '@nestjs/jwt';
// import { JwtStrategy } from './jwt.strategy';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
//     JwtModule.register({
//       secret: 'secret123', // use .env for production!
//       signOptions: { expiresIn: '7d' },
//     }),
//   ],
//   controllers: [AuthController],
//   providers: [AuthService, JwtStrategy],
// })
// export class AuthModule {}
