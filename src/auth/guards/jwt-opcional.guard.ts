import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Deja pasar tanto peticiones anónimas como autenticadas: si viene un token válido
// llena `req.user`, y si no viene, la petición sigue igual en vez de dar 401.
//
// Lo necesita `PATCH /transportes/solicitudes/:id`, que atiende dos casos por la
// misma ruta: el estudiante sin cuenta editando su solicitud antes del cierre, y
// el administrativo editándola después. Quién es determina qué se le permite.
@Injectable()
export class JwtOpcionalGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser | undefined {
    return user || undefined;
  }
}
