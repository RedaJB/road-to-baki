/** Envoi d'e-mails via l'API Resend (https://resend.com), sans dépendance */

export function mailerConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM;
}

export async function sendRestoreCode(to: string, code: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [to],
      subject: `${code} : ton code Road to Baki`,
      text: `Ton code pour restaurer ton abonnement Road to Baki Pro : ${code}\n\nIl expire dans 10 minutes. Si tu n'as rien demandé, ignore cet e-mail.`,
      html: `<p>Ton code pour restaurer ton abonnement Road to Baki Pro :</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Il expire dans 10 minutes. Si tu n'as rien demandé, ignore cet e-mail.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}
