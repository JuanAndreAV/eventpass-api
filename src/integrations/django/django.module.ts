import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DjangoService } from './django.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    })
  ],
  providers: [DjangoService],
  exports: [DjangoService]
})
export class DjangoModule {}
