/**
 * Identité de l'éditeur pour les pages légales, renseignée par variables d'environnement
 * (NEXT_PUBLIC_LEGAL_*, voir .env.example) : rien à modifier dans le code.
 */
export const LEGAL = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME,
  status: process.env.NEXT_PUBLIC_LEGAL_STATUS,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS,
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL,
  director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || process.env.NEXT_PUBLIC_LEGAL_NAME,
  host: process.env.NEXT_PUBLIC_LEGAL_HOST || 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  mediator: process.env.NEXT_PUBLIC_LEGAL_MEDIATOR,
  since: process.env.NEXT_PUBLIC_LEGAL_SINCE,
};

/** Valeur renseignée, sinon champ surligné à compléter */
export function LegalField({ value, todo }: { value?: string; todo: string }) {
  return value ? <>{value}</> : <span className="todo">{todo}</span>;
}
