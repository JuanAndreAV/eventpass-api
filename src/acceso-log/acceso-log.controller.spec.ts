import { Test, TestingModule } from '@nestjs/testing';
import { AccesoLogController } from './acceso-log.controller';
import { AccesoLogService } from './acceso-log.service';

describe('AccesoLogController', () => {
  let controller: AccesoLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccesoLogController],
      providers: [AccesoLogService],
    }).compile();

    controller = module.get<AccesoLogController>(AccesoLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
