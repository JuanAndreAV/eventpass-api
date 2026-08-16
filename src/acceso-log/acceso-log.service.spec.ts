import { Test, TestingModule } from '@nestjs/testing';
import { AccesoLogService } from './acceso-log.service';

describe('AccesoLogService', () => {
  let service: AccesoLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccesoLogService],
    }).compile();

    service = module.get<AccesoLogService>(AccesoLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
