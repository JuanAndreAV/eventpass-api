import { Test, TestingModule } from '@nestjs/testing';
import { ValidacionIdentidadService } from './validacion-identidad.service';

describe('ValidacionIdentidadService', () => {
  let service: ValidacionIdentidadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidacionIdentidadService],
    }).compile();

    service = module.get<ValidacionIdentidadService>(ValidacionIdentidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
