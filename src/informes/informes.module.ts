import { Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';
import { DjangoModule } from 'src/integrations/django/django.module';

@Module({
  imports: [DjangoModule],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}
