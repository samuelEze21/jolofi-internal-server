import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || ''),
    AuthModule,
  ],
})
export class AppModule {}









// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

// @Module({
//   imports: [],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}


// @Module({
//   imports: [
//     ConfigModule.forRoot(),
//     MongoDBConfig,
//     UsersModule,
//     AuthModule,
//     WalletModule,
//     ...
//   ],
// })
// export class AppModule {}
