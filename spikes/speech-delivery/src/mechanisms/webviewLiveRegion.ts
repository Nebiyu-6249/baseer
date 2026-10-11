import * as vscode from 'vscode';
import type { Fixture } from '../fixtures';
import { getChannel, logAnnouncement } from '../log';

export const NAME = 'D · webview live region';

/**
 * Not a delay before posting — a failure detector. If the webview has not said
 * it is ready by then, the press is logged as invalid instead of silently
 * dropping the text, which would read as a false "not announced".
 */
const READY_TIMEOUT_MS = 10_000;

interface LivePanel {
  readonly panel: vscode.WebviewPanel;
  /** Resolves true when the webview's script is listening; false if it never is. */
  readonly ready: Promise<boolean>;
}

let live: LivePanel | undefined;

type FromWebview =
  { readonly type: 'ready' } | { readonly type: 'rendered'; readonly chars: number };

function parseMessage(msg: unknown): FromWebview | undefined {
  if (typeof msg !== 'object' || msg === null) return undefined;
  const m = msg as Record<string, unknown>;
  if (m['type'] === 'ready') return { type: 'ready' };
  if (m['type'] === 'rendered' && typeof m['chars'] === 'number') {
    return { type: 'rendered', chars: m['chars'] };
  }
  return undefined;
}

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function html(cspSource: string, n: string): string {
  // Strict CSP: no remote anything, scripts only via nonce. Mirrors the policy
  // the real chat panel will need (THREAT_MODEL T3.5 — model-authored links and
  // images are an exfiltration channel).
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${cspSource} 'nonce-${n}'; script-src 'nonce-${n}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Baseer spike — live region</title>
<style nonce="${n}">
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
         background: var(--vscode-editor-background); padding: 1rem; line-height: 1.6; }
  #announcement { font-size: 1rem; }
  [dir="rtl"] { text-align: right; }
  .hint { opacity: 0.8; font-size: 0.85rem; margin-bottom: 1rem; }
</style>
</head>
<body>
  <p class="hint">Baseer spike D. Text below is injected into an aria-live region.</p>
  <!-- role=status + aria-live=polite: announce without stealing focus. -->
  <div id="announcement" role="status" aria-live="polite" aria-atomic="true"></div>
<script nonce="${n}">
  const host = acquireVsCodeApi();
  const target = document.getElementById('announcement');
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'announce') return;
    target.setAttribute('dir', msg.dir === 'rtl' ? 'rtl' : 'ltr');
    // Clear first: some screen readers ignore a live region whose content is
    // replaced in a single mutation. Two ticks is the usual workaround.
    target.textContent = '';
    setTimeout(() => {
      // textContent never parses HTML, so the raw text is safe here.
      target.textContent = msg.text;
      host.postMessage({ type: 'rendered', chars: msg.text.length });
    }, 60);
  });
  // Last statement: the listener above is attached, so nothing posted after
  // this point can be lost.
  host.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}

/**
 * Candidate D — a webview with an ARIA live region.
 *
 * The only candidate that maps onto real aria-live semantics, and the only one
 * that could announce without stealing focus. Also the most fragile: webview
 * accessibility depends on the screen reader treating the embedded iframe as
 * live content, which is exactly what the spike has to find out. If this fails
 * under NVDA, the chat panel needs a different design.
 */
export async function announce(fixture: Fixture): Promise<void> {
  logAnnouncement(NAME, fixture.label, fixture.text);

  live ??= open();
  const { panel, ready } = live;
  // Every press waits on the same promise, so presses made before the webview
  // loads are queued and delivered in order rather than dropped.
  if (!(await ready)) {
    getChannel().appendLine(
      `    ${NAME}: webview never signalled ready. This press is INVALID — a spike ` +
        'problem, not a mechanism result. Close the panel and press again.',
    );
    return;
  }
  await panel.webview.postMessage({ type: 'announce', text: fixture.text, dir: fixture.dir });
}

function open(): LivePanel {
  const panel = vscode.window.createWebviewPanel(
    'baseerSpikeLiveRegion',
    'Baseer spike — live region',
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const ready = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), READY_TIMEOUT_MS);
    const settle = (ok: boolean): void => {
      clearTimeout(timer);
      resolve(ok);
    };
    const sub = panel.webview.onDidReceiveMessage((raw: unknown) => {
      const msg = parseMessage(raw);
      if (msg?.type === 'ready') settle(true);
      if (msg?.type === 'rendered') {
        getChannel().appendLine(
          `[${new Date().toISOString()}] ${NAME} :: live region updated (${msg.chars} characters)`,
        );
      }
    });
    panel.onDidDispose(() => {
      sub.dispose();
      settle(false);
      live = undefined;
    });
  });

  // Set the HTML only after the listener exists, so the ready message cannot
  // arrive before anyone is listening for it.
  panel.webview.html = html(panel.webview.cspSource, nonce());
  return { panel, ready };
}
