/* Kesler Go — contact form.
 * GitHub Pages can't receive form submissions, so the form posts to Formspree
 * (https://formspree.io), which emails each inquiry to the address you register there.
 * Setup: replace YOUR_FORM_ID in contact.html's <form action="..."> (see README.md).
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function init() {
    var form = $('contact-form');
    if (!form) return;
    var errorEl = $('contact-error');
    var thanks = $('contact-thanks');
    var button = form.querySelector('button[type="submit"]');
    var buttonText = button ? button.textContent : '';

    function showError(msg) {
      errorEl.innerHTML = msg;
      errorEl.hidden = false;
    }

    form.addEventListener('input', function () { errorEl.hidden = true; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('c-name').value.trim();
      var email = $('c-email').value.trim();
      var message = $('c-msg').value.trim();

      if (!name) { showError('Please add your name.'); $('c-name').focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Please add a valid email address.'); $('c-email').focus(); return; }
      if (!message) { showError('Please include a short message.'); $('c-msg').focus(); return; }

      if (form.action.indexOf('YOUR_FORM_ID') !== -1) {
        showError('The inquiry form is not connected yet. Please email ' +
          '<a href="mailto:kesler@keslergo.com" style="color:#b00101">kesler@keslergo.com</a> or message ' +
          '<a href="https://instagram.com/fengshui.go" style="color:#b00101">@fengshui.go</a> on Instagram.');
        return;
      }

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        $('thanks-name').textContent = name.split(/\s+/)[0];
        $('thanks-email').textContent = email;
        form.hidden = true;
        thanks.hidden = false;
        form.reset();
      }).catch(function () {
        showError('Sorry, your inquiry could not be sent just now. Please try again, or email ' +
          '<a href="mailto:kesler@keslergo.com" style="color:#b00101">kesler@keslergo.com</a>.');
      }).then(function () {
        if (button) { button.disabled = false; button.textContent = buttonText; }
      });
    });

    var reset = $('contact-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        thanks.hidden = true;
        form.hidden = false;
        $('c-name').focus();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
