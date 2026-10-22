// Prueba manual del flujo de refresh token contra la API real:
// login -> profile -> refresh (rota ambos tokens) -> profile de nuevo ->
// el refresh token viejo ya no sirve (rotación) -> logout -> refresh ya no
// sirve (revocado). No modifica datos permanentes (solo cookies/sesión).
// Uso: node scripts/probar-refresh.js
const BASE = 'http://localhost:3000/api/v1/eventpass';
const EMAIL = 'tic@redmusicasmedellin.co';
const PASSWORD = 'M3d3ll1n2025**';

let fallos = 0;
function verificar(nombre, cond, detalle = '') {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
}

function parseCookies(setCookieHeaders, jar) {
  for (const header of setCookieHeaders || []) {
    const [pair] = header.split(';');
    const idx = pair.indexOf('=');
    jar[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
}
const cookieHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
const post = (path, jar) => fetch(`${BASE}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(jar) },
  body: '{}',
});

async function main() {
  const jar = {};

  let res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  parseCookies(res.headers.getSetCookie?.() ?? [], jar);
  verificar('login emite cookies jwt + refresh_token', !!jar.jwt && !!jar.refresh_token, `status ${res.status}`);

  res = await fetch(`${BASE}/auth/profile`, { headers: { Cookie: cookieHeader(jar) } });
  verificar('profile con el access token recién emitido', res.status === 200);

  const refreshViejo = jar.refresh_token;
  res = await post('/auth/refresh', jar);
  parseCookies(res.headers.getSetCookie?.() ?? [], jar);
  verificar('refresh responde 201 y rota el refresh token', res.status === 201 && jar.refresh_token !== refreshViejo);

  res = await fetch(`${BASE}/auth/profile`, { headers: { Cookie: cookieHeader(jar) } });
  verificar('profile con el access token nuevo (post-refresh)', res.status === 200);

  res = await post('/auth/refresh', { refresh_token: refreshViejo });
  verificar('reusar el refresh token viejo ya rotado -> 401', res.status === 401);

  res = await post('/auth/logout', jar);
  verificar('logout responde 201', res.status === 201);

  res = await post('/auth/refresh', jar);
  verificar('refresh después de logout -> 401 (revocado)', res.status === 401);

  console.log(fallos === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallos} prueba(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
