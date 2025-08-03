import { MongooseModule } from '@nestjs/mongoose';

export const MongoDBConfig = MongooseModule.forRoot(process.env.MONGO_URI || '');
