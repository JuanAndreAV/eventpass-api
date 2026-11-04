import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DjangoService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService
      .getOrThrow<string>('DJANGO_API_URL')
      .replace(/\/+$/, '');
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(
          `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`,
        ),
      );

      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          status?: number;
        };
      };

      if (axiosError && typeof axiosError === 'object' && 'response' in axiosError && axiosError.response) {
        throw new InternalServerErrorException(
          'Error al consultar el sistema histórico de informes',
        );
      }

      throw new ServiceUnavailableException(
        'No fue posible conectar con el sistema histórico',
      );
    }
  }
}