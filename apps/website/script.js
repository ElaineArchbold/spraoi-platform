const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

menuToggle?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const button = form.querySelector('button[type="submit"]');
  status.className = 'form-status';
  status.textContent = 'Sending your request…';
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Your request could not be sent.');
    form.reset();
    status.className = 'form-status success';
    status.textContent = 'Thanks — your information request has been sent.';
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = error.message || 'Something went wrong. Please try again.';
  } finally {
    button.disabled = false;
  }
});
