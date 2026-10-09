/* Page behavior: Meta Pixel, the registration form, and the thank-you page.
   Settings come from config.js. */
(function () {
  var C = window.WORKSHOP || {};

  /* ---------- Meta Pixel (only runs when config.js has a pixelId) ---------- */
  if (C.pixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', C.pixelId);
    window.fbq('track', 'PageView');
  }
  function track(eventName) {
    if (window.fbq) window.fbq('track', eventName);
  }

  /* ---------- Registration form ---------- */
  var form = document.getElementById('reg-form');
  if (form) {
    var errorBox = document.getElementById('form-error');
    var button = form.querySelector('button[type="submit"]');
    var buttonHTML = button.innerHTML;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var payload = {
        firstName: String(data.get('firstName') || '').trim(),
        email: String(data.get('email') || '').trim(),
        date: String(data.get('date') || ''),
        role: String(data.get('role') || ''),
        website: String(data.get('website') || '') // spam trap
      };

      if (!payload.date) { showError('Pick the evening you want to attend.'); return; }
      if (!payload.firstName) { showError('Enter your first name.', 'firstName'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) { showError('Enter a valid email address so I can send your Zoom link.', 'email'); return; }

      errorBox.hidden = true;
      button.disabled = true;
      button.textContent = 'Saving your seat…';

      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json()
            .catch(function () { return {}; })
            .then(function (json) { return { ok: res.ok && json.ok, error: json.error }; });
        })
        .then(function (result) {
          if (result.ok) {
            window.location.href = 'thank-you.html?d=' + encodeURIComponent(payload.date);
            return;
          }
          fail(result.error);
        })
        .catch(function () { fail(); });
    });

    function fail(message) {
      button.disabled = false;
      button.innerHTML = buttonHTML;
      var contact = C.contactEmail && C.contactEmail.indexOf('[') === -1 ? C.contactEmail : 'me';
      showError((message ? message + ' ' : 'Something went wrong saving your seat. ') +
        'Please try again. If it keeps happening, email ' + contact + ' and I\'ll register you myself.');
    }

    function showError(message, fieldId) {
      errorBox.textContent = message;
      errorBox.hidden = false;
      var field = fieldId && document.getElementById(fieldId);
      if (field) { field.focus(); } else { errorBox.focus(); }
    }
  }

  /* ---------- Thank-you page ---------- */
  var thankYou = document.getElementById('ty');
  if (thankYou) {
    var key = new URLSearchParams(window.location.search).get('d');
    var d = C.dates && C.dates[key];

    if (d) {
      document.getElementById('ty-when').textContent =
        'You\'re registered for ' + d.label + ' at ' + d.time + ', live on Zoom.';

      var title = C.title || 'Workshop';
      var details = 'Free live workshop' +
        (C.hostName && C.hostName.indexOf('[') === -1 ? ' with ' + C.hostName : '') + '. ' +
        (d.zoom ? 'Join on Zoom: ' + d.zoom : 'Your Zoom link is in your confirmation email.');
      var where = d.zoom || 'Zoom (link in your confirmation email)';

      document.getElementById('cal-google').href =
        'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent(title) +
        '&dates=' + d.startUtc + '/' + d.endUtc +
        '&details=' + encodeURIComponent(details) +
        '&location=' + encodeURIComponent(where);

      var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Workshop//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:workshop-' + key + '@' + window.location.hostname,
        'DTSTAMP:' + stamp,
        'DTSTART:' + d.startUtc,
        'DTEND:' + d.endUtc,
        'SUMMARY:' + icsText(title),
        'DESCRIPTION:' + icsText(details),
        'LOCATION:' + icsText(where),
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      var icsLink = document.getElementById('cal-ics');
      icsLink.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
      icsLink.download = 'workshop-' + key + '.ics';

      document.getElementById('cal-btns').hidden = false;
      track('Lead');
    }

    var shareUrl = window.location.origin + '/';
    var shareBox = document.getElementById('share-url');
    var copyButton = document.getElementById('copy-link');
    shareBox.textContent = shareUrl;
    copyButton.addEventListener('click', function () {
      var done = function () {
        copyButton.textContent = 'Copied';
        setTimeout(function () { copyButton.textContent = 'Copy link'; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done, function () { selectText(shareBox); });
      } else {
        selectText(shareBox);
      }
    });
  }

  function icsText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  }
  function selectText(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
})();
