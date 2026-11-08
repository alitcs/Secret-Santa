const test = require('node:test');
const assert = require('node:assert/strict');
const { handler, _test } = require('../netlify/functions/send-exchange');

const participants = [
  { name: 'Alex Green', email: 'alex@example.com', interests: 'coffee' },
  { name: 'Blair', email: 'blair@example.com', interests: 'books' },
  { name: 'Casey', email: 'casey@example.com', interests: '' },
];
const input = { budget: '$30', deadline: '2027-12-25', participants, accessCode: 'a-very-long-secret-code' };

test('every draw is a permutation with no self matches, including two people', () => {
  for (let size = 2; size <= 50; size++) {
    const people = Array.from({ length: size }, (_, i) => ({ id: i }));
    for (let trial = 0; trial < 30; trial++) {
      const recipients = _test.makeRecipients(people);
      assert.equal(new Set(recipients).size, size);
      recipients.forEach((recipient, index) => assert.notEqual(recipient, people[index]));
    }
  }
});

test('messages contain only each giver’s match and their interests', () => {
  const messages = _test.makeMessages(participants, [participants[1], participants[2], participants[0]], input.deadline, input.budget, 'santa@example.com');
  assert.deepEqual(messages[0].to, ['alex@example.com']);
  assert.match(messages[0].text, /Blair/);
  assert.match(messages[0].text, /books/);
  assert.doesNotMatch(messages[0].text, /Casey|coffee/);
  assert.doesNotMatch(messages[1].text, /gift inspiration/);
});

test('validates group size, addresses, text and real dates', () => {
  assert.equal(_test.validate(input), null);
  assert.match(_test.validate({ ...input, deadline: '2027-02-29' }), /deadline/);
  assert.match(_test.validate({ ...input, participants: [participants[0]] }), /between 2 and 50/);
  assert.match(_test.validate({ ...input, participants: [...participants, { ...participants[0], email: 'ALEX@example.com' }] }), /different email/);
  assert.match(_test.validate({ ...input, participants: [{ ...participants[0], email: 'bad' }, participants[1]] }), /valid email/);
  assert.match(_test.validate({ ...input, budget: ' \t ' }), /budget/);
  assert.match(_test.validate({ ...input, participants: [{ ...participants[0], interests: 'a\nb' }, participants[1]] }), /Interests/);
});

test('handler checks configuration, authorization and sends a batch without returning matches', async () => {
  const oldEnv = { ...process.env };
  const oldFetch = global.fetch;
  try {
    delete process.env.RESEND_API_KEY;
    assert.equal((await handler({ httpMethod: 'POST', body: '{}' })).statusCode, 503);
    process.env.RESEND_API_KEY = 'test-key';
    process.env.SANTA_FROM_EMAIL = 'santa@example.com';
    process.env.SANTA_ACCESS_CODE = input.accessCode;
    assert.equal((await handler({ httpMethod: 'GET' })).statusCode, 405);
    assert.equal((await handler({ httpMethod: 'POST', body: '{' })).statusCode, 400);
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...input, accessCode: 'wrong' }) })).statusCode, 401);
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...input, deadline: 'invalid' }) })).statusCode, 400);

    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails/batch');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      const sent = JSON.parse(options.body);
      assert.equal(sent.length, 3);
      sent.forEach((mail, index) => {
        assert.deepEqual(mail.to, [participants[index].email]);
        assert.doesNotMatch(mail.text, new RegExp(`match is:\\n\\n${participants[index].name}\\n`));
      });
      return { ok: true, status: 200 };
    };
    const result = await handler({ httpMethod: 'POST', body: JSON.stringify(input) });
    assert.equal(result.statusCode, 200);
    assert.doesNotMatch(result.body, /Alex|Blair|Casey|example\.com/);
    global.fetch = async () => ({ ok: false, status: 429 });
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(input) })).statusCode, 502);
    global.fetch = async () => { throw new Error('network failure'); };
    assert.match(JSON.parse((await handler({ httpMethod: 'POST', body: JSON.stringify(input) })).body).error, /could not confirm/);
  } finally {
    process.env = oldEnv;
    global.fetch = oldFetch;
  }
});
