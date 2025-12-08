export async function dispatchDocsDeploy() {
  const repo = String(import.meta.env.VITE_GITHUB_REPO || '').trim();
  const workflow = String(import.meta.env.VITE_GITHUB_WORKFLOW || 'deploy-docs.yml');
  const token = String(import.meta.env.VITE_GITHUB_TOKEN || '').trim();
  if (!repo || !token) throw new Error('Missing GitHub configuration');
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const data = await res.json(); msg = data?.message || msg; } catch {}
    throw new Error(msg);
  }
  return { ok: true };
}

