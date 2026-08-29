import { Test, TestingModule } from '@nestjs/testing';
import { ValidacionIdentidadController } from './validacion-identidad.controller';
import { ValidacionIdentidadService } from './validacion-identidad.service';

describe('ValidacionIdentidadController', () => {
  let controller: ValidacionIdentidadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidacionIdentidadController],
      providers: [ValidacionIdentidadService],
    }).compile();

    controller = module.get<ValidacionIdentidadController>(ValidacionIdentidadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
