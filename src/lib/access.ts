/**
 * 谁能改站点上的内容：验请求上的 `CF-Access-JWT`。
 *
 * Access 在边缘验完身份（邮箱一次性验证码）后，往转发给源站的请求上挂一个 JWT。
 * 源站必须自己再验一遍 —— 绕开 Access 直达 Worker 是做得到的。反过来客户端伪造的
 * 同名头到不了这里：Cloudflare 会先把外部传进来的 `CF-Access-JWT` 剥掉，只有它自己
 * 签发的才会留在链路上（实测：未登录的请求连源站都到不了，直接 302 去登录页）。
 *
 * ⚠ 证书是 **RSA / RS256**（实测 `https://{team}/cdn-cgi/access/certs` 的 `keys` 里
 *   每一项都是 kty:RSA、带 e/n，没有 x/y）。以前按 EC P-256 去 importKey，验签永远
 *   不通过，表现就是「登录走完了，还是被弹回首页」。现在按 kid 找证书、按证书自己的
 *   kty 选算法，将来 Access 换成 EC 也不用再改这里。
 *
 * 两个配置在 wrangler.jsonc 的 vars 里：CF_ACCESS_TEAM_DOMAIN（登录页那个域名）、
 * CF_ACCESS_AUD（应用详情页的 App Auditory ID）。少配任何一个就一律拒绝，
 * 不会退化成「谁都能写」。本地 dev 没有 Access 可验，走 canWrite 那条例外。
 */
const JWKS_TTL_MS = 5 * 60 * 1000;

type Jwk = { kid?: string; kty?: string; alg?: string; [member: string]: unknown };
let certs: { at: number; list: Jwk[] } | null = null;

/** JWT 的段是 base64url、没有填充等号，而 atob 要求长度是 4 的倍数，所以自己补 */
function decodeB64url(seg: string): Uint8Array {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(seg: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeB64url(seg)));
}

async function getCerts(teamDomain: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < JWKS_TTL_MS) return certs.list;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`拿 Access 的公钥失败：HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const list = body.keys ?? [];
  if (list.length === 0) throw new Error('Access 的公钥列表是空的');
  certs = { at: Date.now(), list };
  return list;
}

/** 拒绝的理由只进日志（npx wrangler tail 看得见），不给客户端回任何细节 */
function refuse(team: string, why: string): false {
  console.warn(`[access] 拒绝：${why}（team=${team}）`);
  return false;
}

/** @returns 这个请求是不是过了 Access 的自己人；不是的话页面按访客处理 */
export async function isAuthorized(
  req: Request,
  env: Record<string, string | undefined>
): Promise<boolean> {
  const team = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;
  const jwt = req.headers.get('CF-Access-JWT');
  if (!team || !aud) return refuse(team ?? '(未配置)', '没配 CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD');
  if (!jwt) return refuse(team, '请求上没有 CF-Access-JWT');

  const [h, p, sig] = jwt.split('.');
  if (!h || !p || !sig) return refuse(team, 'JWT 不是三段');

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodeJson(h);
    payload = decodeJson(p);
  } catch (e) {
    return refuse(team, `JWT 的段解不开：${(e as Error).message}`);
  }

  if (payload.aud !== aud) return refuse(team, `aud 对不上：${String(payload.aud).slice(0, 16)}`);
  if (payload.iss !== `https://${team}/cdn-cgi/access`) return refuse(team, `iss = ${String(payload.iss)}`);
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return refuse(team, 'JWT 过期了');

  let list: Jwk[];
  try {
    list = await getCerts(team);
  } catch (e) {
    return refuse(team, (e as Error).message);
  }
  const cert =
    list.find((c) => c.kid !== undefined && c.kid === header.kid) ??
    list.find((c) => c.alg !== undefined && c.alg === header.alg) ??
    list[0];

  const isRsa = cert.kty === 'RSA';
  const importParams: RsaHashedImportParams | EcdsaParams = isRsa
    ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
    : { name: 'ECDSA', namedCurve: 'P-256' };
  const verifyParams: AlgorithmIdentifier | EcdsaParams = isRsa
    ? { name: 'RSASSA-PKCS1-v1_5' }
    : { name: 'ECDSA', hash: 'SHA-256' };

  try {
    const key = await crypto.subtle.importKey('jwk', cert as JsonWebKey, importParams, false, ['verify']);
    const ok = await crypto.subtle.verify(
      verifyParams,
      key,
      decodeB64url(sig),
      new TextEncoder().encode(`${h}.${p}`)
    );
    if (!ok) return refuse(team, `签名验不过：kid=${String(header.kid)} alg=${String(header.alg)} kty=${String(cert.kty)}`);
    return true;
  } catch (e) {
    return refuse(team, `验签抛错：${(e as Error).message}（kid=${String(header.kid)} kty=${String(cert.kty)}）`);
  }
}

/**
 * 整站唯一一条「这次请求能不能写」的判据，写作页、那颗按钮、接口三处都用它。
 * 本地 dev 没有 Access 可验，直接放行；线上必须验 JWT。
 */
export async function canWrite(
  request: Request,
  env: Record<string, string | undefined>
): Promise<boolean> {
  return import.meta.env.DEV || isAuthorized(request, env);
}
