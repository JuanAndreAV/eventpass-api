import { Test, TestingModule } from '@nestjs/testing';
import { AsistentesService } from './asistentes.service';

describe('AsistentesService', () => {
  let service: AsistentesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AsistentesService],
    }).compile();

    service = module.get<AsistentesService>(AsistentesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
