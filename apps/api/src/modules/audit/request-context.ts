export type RequestContext = { ip?: string; userAgent?: string };

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

/** Extrai IP e user-agent da requisição para a trilha de auditoria.
 *  Atrás de proxy/Vercel, configure `trust proxy` para `ip` ser o do cliente. */
export function requestContext(req: RequestLike): RequestContext {
  const ua = req.headers['user-agent'];
  return { ip: req.ip, userAgent: Array.isArray(ua) ? ua[0] : ua };
}
