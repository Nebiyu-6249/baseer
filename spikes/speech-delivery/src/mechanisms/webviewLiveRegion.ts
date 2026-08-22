import * as vscode from 'vscode';
import type { Fixture } from '../fixtures';
import { logAnnouncement } from '../log';

export const NAME = 'D · webview live region';

let panel: vscode.WebviewPanel | undefined;

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const target = document.getElementById('announcement');
  window.addEventListener('message', (event) => {
    const { text, dir } = event.data;
    target.setAttribute('dir', dir);
    // Clear first: some screen readers ignore a live region whose content is
    // replaced in a single mutation. Two ticks is the usual workaround.
    target.textContent = '';
    setTimeout(() => { target.textContent = text; }, 60);
  });
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

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'baseerSpikeLiveRegion',
      'Baseer spike — live region',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.onDidDispose(() => {
      panel = undefined;
    });
    const n = nonce();
    panel.webview.html = html(panel.webview.cspSource, n);
    // Give the document a moment to parse before the first post.
    await new Promise((r) => setTimeout(r, 250));
  }

  await panel.webview.postMessage({ text: escapeHtml(fixture.text), dir: fixture.dir });
}
