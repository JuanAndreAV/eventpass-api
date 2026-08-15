import { Test, TestingModule } from '@nestjs/testing';
import { AccesosController } from './accesos.controller';
import { AccesosService } from './accesos.service';

describe('AccesosController', () => {
  let controller: AccesosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccesosController],
      providers: [AccesosService],
    }).compile();

    controller = module.get<AccesosController>(AccesosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
