import { Test, TestingModule } from '@nestjs/testing';
import { EstudiantesImportController } from './estudiantes-import.controller';
import { EstudiantesImportService } from './estudiantes-import.service';

describe('EstudiantesImportController', () => {
  let controller: EstudiantesImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstudiantesImportController],
      providers: [EstudiantesImportService],
    }).compile();

    controller = module.get<EstudiantesImportController>(EstudiantesImportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
