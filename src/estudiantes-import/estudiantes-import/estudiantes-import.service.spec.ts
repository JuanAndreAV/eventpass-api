import { Test, TestingModule } from '@nestjs/testing';
import { EstudiantesImportService } from './estudiantes-import.service';

describe('EstudiantesImportService', () => {
  let service: EstudiantesImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EstudiantesImportService],
    }).compile();

    service = module.get<EstudiantesImportService>(EstudiantesImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
