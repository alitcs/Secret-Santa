const { createHash, randomInt, timingSafeEqual } = require('node:crypto');

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function validText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value);
}

function sameSecret(a, b) {
  const hash = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Invalid request.';
  if (!validText(input.budget, 60)) return 'Enter a gift budget of up to 60 characters.';
  if (typeof input.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) return 'Enter a valid gift deadline.';
  const date = new Date(`${input.deadline}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.deadline) return 'Enter a valid gift deadline.';
  if (!Array.isArray(input.participants) || input.participants.length < 2 || input.participants.length > 50) return 'Add between 2 and 50 people.';
  const seen = new Set();
  for (const person of input.participants) {
    if (!person || typeof person !== 'object' || !validText(person.name, 80)) return 'Enter a name for each person.';
    if (typeof person.email !== 'string' || person.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) return 'Enter a valid email address for each person.';
    if (typeof person.interests !== 'string' || person.interests.length > 500 || /[\u0000-\u001f\u007f]/.test(person.interests)) return 'Interests must be at most 500 characters on one line.';
    const email = person.email.trim().toLowerCase();
    if (seen.has(email)) return 'Each person needs a different email address.';
    seen.add(email);
  }
  return null;
}

// Sattolo's shuffle creates one random cycle, so nobody can draw themselves.
function makeRecipients(participants) {
  const recipients = [...participants];
  for (let i = recipients.length - 1; i > 0; i--) {
    const j = randomInt(i);
    [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
  }
  return recipients;
}

function makeMessages(participants, recipients, deadline, budget, from) {
  return participants.map((person, index) => {
    const recipient = recipients[index];
    const interests = recipient.interests.trim();
    return {
      from,
      to: [person.email.trim()],
      subject: 'Your Secret Santa match is here!',
      text: `Hi ${person.name.trim()},\n\nIt's time for Secret Santa! Your match is:\n\n${recipient.name.trim()}\n\n${interests ? `A little gift inspiration: ${interests}\n\n` : ''}Gift budget: ${budget.trim()}\nGift deadline: ${deadline}\n\nRemember, it's a secret! Happy gifting.`,
    };
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Use POST to send an exchange.' });
  const { RESEND_API_KEY, SANTA_FROM_EMAIL, SANTA_ACCESS_CODE } = process.env;
  if (!RESEND_API_KEY || !SANTA_FROM_EMAIL || !SANTA_ACCESS_CODE || SANTA_ACCESS_CODE.length < 16) {
    console.error('Email service or organizer access code is not configured.');
    return reply(503, { error: 'The site owner needs to configure email and an organizer access code before sending.' });
  }
  if (typeof event.body !== 'string' || event.body.length > 100000) return reply(400, { error: 'Invalid request.' });
  let input;
  try {
    input = JSON.parse(event.body);
  } catch {
    return reply(400, { error: 'Invalid request.' });
  }
  if (!input || typeof input.accessCode !== 'string' || input.accessCode.length > 256 || !sameSecret(input.accessCode, SANTA_ACCESS_CODE)) {
    return reply(401, { error: 'That organizer access code is not correct.' });
  }
  const error = validate(input);
  if (error) return reply(400, { error });

  const recipients = makeRecipients(input.participants);
  const messages = makeMessages(input.participants, recipients, input.deadline, input.budget, SANTA_FROM_EMAIL);
  let response;
  try {
    response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error('Email provider request failed:', error.name);
    return reply(502, { error: 'We could not confirm whether your emails were sent. Check your email provider dashboard before trying again.' });
  }
  if (!response.ok) {
    console.error('Email provider rejected the request:', response.status);
    return reply(502, { error: 'The email service returned an error. Check its dashboard and configuration before trying again.' });
  }
  return reply(200, { message: 'Email service accepted the messages.' });
};

exports._test = { validate, makeRecipients, makeMessages };
