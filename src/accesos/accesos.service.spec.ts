import { Test, TestingModule } from '@nestjs/testing';
import { AccesosService } from './accesos.service';

describe('AccesosService', () => {
  let service: AccesosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccesosService],
    }).compile();

    service = module.get<AccesosService>(AccesosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
