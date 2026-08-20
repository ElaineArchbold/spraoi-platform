import { Resend } from 'resend';

const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { name, email, club, sport, interest, message, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });

  const safeName = clean(name, 120);
  const safeEmail = clean(email, 180);
  const safeClub = clean(club, 180);
  const safeSport = clean(sport, 80);
  const safeInterest = clean(interest, 120);
  const safeMessage = clean(message, 4000);

  if (!safeName || !safeEmail || !safeClub || !safeMessage) {
    return res.status(400).json({ error: 'Please complete the required fields.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return res.status(500).json({ error: 'The contact form is not configured yet.' });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      replyTo: safeEmail,
      subject: `Spraoi Sports enquiry — ${safeClub}`,
      text: [
        `Name: ${safeName}`,
        `Email: ${safeEmail}`,
        `Club: ${safeClub}`,
        `Sport: ${safeSport || 'Not specified'}`,
        `Interest: ${safeInterest || 'General information'}`,
        '',
        safeMessage
      ].join('\n')
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Your request could not be sent. Please try again.' });
  }
}
