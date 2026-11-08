(() => {
  const form = document.querySelector('#exchange-form');
  const list = document.querySelector('#participants');
  const template = document.querySelector('#participant-template');
  const addButton = document.querySelector('#add-person');
  const submitButton = document.querySelector('#submit-button');
  const message = document.querySelector('#form-message');
  const maximumPeople = 50;

  function updatePeople() {
    const cards = [...list.querySelectorAll('.participant')];
    document.querySelector('#people-count').textContent = `${cards.length} ${cards.length === 1 ? 'PERSON' : 'PEOPLE'}`;
    document.querySelector('#summary-count').textContent = `${cards.length} ${cards.length === 1 ? 'person' : 'people'}`;
    addButton.disabled = cards.length >= maximumPeople;
    cards.forEach((card, index) => {
      card.querySelector('legend').textContent = `Person ${index + 1}`;
      card.querySelector('.participant-label').textContent = `PERSON ${String(index + 1).padStart(2, '0')}`;
      const remove = card.querySelector('.remove-person');
      remove.disabled = cards.length <= 2;
      remove.setAttribute('aria-label', `Remove person ${index + 1}`);
    });
  }

  function addPerson(focus = false) {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector('.remove-person').addEventListener('click', () => {
      card.remove();
      updatePeople();
      addButton.focus();
    });
    list.append(card);
    updatePeople();
    if (focus) card.querySelector('.person-name').focus();
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
    message.hidden = false;
    message.focus();
  }

  addButton.addEventListener('click', () => addPerson(true));
  addPerson();
  addPerson();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const participants = [...list.querySelectorAll('.participant')].map((card) => ({
      name: card.querySelector('.person-name').value.trim(),
      email: card.querySelector('.person-email').value.trim(),
      interests: card.querySelector('.person-interests').value.trim(),
    }));
    const emails = participants.map((person) => person.email.toLowerCase());
    if (new Set(emails).size !== emails.length) {
      showMessage('Each person needs a different email address. Please check your list.', true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending your secrets…';
    message.hidden = true;
    let completed = false;
    try {
      const response = await fetch('/.netlify/functions/send-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: document.querySelector('#deadline').value,
          budget: document.querySelector('#budget').value.trim(),
          accessCode: document.querySelector('#access-code').value,
          participants,
        }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('We could not confirm whether your emails were sent. Check your email provider dashboard before trying again.');
      }
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Check your email provider dashboard before trying again.');
      completed = true;
      document.querySelector('#access-code').value = '';
      showMessage('Your secrets are on their way! The email service accepted the messages. Check its dashboard for delivery status.');
      submitButton.textContent = 'Secrets sent ✓';
    } catch (error) {
      showMessage(error instanceof TypeError
        ? 'We could not confirm whether your emails were sent. Check your email provider dashboard before trying again.'
        : error.message, true);
    } finally {
      if (!completed) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Send the secrets <span aria-hidden="true">↗</span>';
      }
    }
  });
})();
