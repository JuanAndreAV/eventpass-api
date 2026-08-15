import { Test, TestingModule } from '@nestjs/testing';
import { AsistentesController } from './asistentes.controller';
import { AsistentesService } from './asistentes.service';

describe('AsistentesController', () => {
  let controller: AsistentesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsistentesController],
      providers: [AsistentesService],
    }).compile();

    controller = module.get<AsistentesController>(AsistentesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
