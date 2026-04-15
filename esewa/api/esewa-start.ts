export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionUrl = url.searchParams.get('sessionUrl');

    if (!sessionUrl) {
      return htmlPage('Missing session URL.', '', true);
    }

    const sessionRes = await fetch(sessionUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    const raw = await sessionRes.text();

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return htmlPage('Session endpoint returned invalid JSON.', raw, true);
    }

    if (!sessionRes.ok) {
      return htmlPage(
        data?.error || `Session request failed (${sessionRes.status}).`,
        JSON.stringify(data, null, 2),
        true,
      );
    }

    if (!data?.form_url || !data?.form_fields || typeof data.form_fields !== 'object') {
      return htmlPage(
        'Session response is incomplete.',
        JSON.stringify(data, null, 2),
        true,
      );
    }

    const hiddenInputs = Object.entries(data.form_fields)
      .map(([key, value]) => {
        return `<input type="hidden" name="${escapeHtml(String(key))}" value="${escapeHtml(String(value ?? ''))}" />`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening eSewa</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      background: linear-gradient(160deg, #0d1f17 0%, #163929 100%);
      color: #fff;
    }
    .card {
      width: 100%;
      max-width: 380px;
      background: rgba(20,20,20,.92);
      border-radius: 24px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,.3);
    }
    .logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #2f8f2f;
      color: white;
      font-size: 38px;
      font-weight: 900;
    }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { color: #d1d5db; line-height: 1.5; margin-bottom: 18px; }
    .spinner-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #8ee28e;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .spinner {
      width: 22px;
      height: 22px;
      border: 3px solid rgba(255,255,255,.18);
      border-top-color: #8ee28e;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
      margin-top: 18px;
      width: 100%;
      padding: 14px 18px;
      border: none;
      border-radius: 12px;
      background: #16a34a;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }
    .debug {
      margin-top: 14px;
      font-size: 12px;
      color: #9ca3af;
      word-break: break-word;
      text-align: left;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">e</div>
    <h1>Opening eSewa</h1>
    <p>Redirecting you securely to eSewa…</p>
    <div class="spinner-wrap">
      <div class="spinner"></div>
      <span>Opening eSewa</span>
    </div>

    <form id="esewaForm" method="POST" action="${escapeHtml(String(data.form_url))}" accept-charset="UTF-8">
      ${hiddenInputs}
      <button class="btn" type="submit">Continue to eSewa</button>
    </form>

    <div class="debug">Server-rendered form prepared. Attempting auto-submit...</div>
  </div>

  <script>
    setTimeout(() => {
      const form = document.getElementById('esewaForm');
      try {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      } catch (_) {}
    }, 300);
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    return htmlPage(
      'Unexpected server error.',
      String(e),
      true,
    );
  }
}

function htmlPage(message: string, debug: string, isError: boolean) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening eSewa</title>
  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      background: #111827;
      color: white;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #1f2937;
      border-radius: 20px;
      padding: 28px;
    }
    h1 { margin-bottom: 12px; }
    p { margin-bottom: 14px; line-height: 1.5; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      color: #d1d5db;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${isError ? 'Could not continue to eSewa' : 'Opening eSewa'}</h1>
    <p>${escapeHtml(message)}</p>
    <pre>${escapeHtml(debug)}</pre>
  </div>
</body>
</html>`,
    {
      status: isError ? 500 : 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
