/* Read-only Sheet transport. Never initializes portal collection sync. */
const KurtaCloud = (() => {
  const enabled = () => typeof KURTA_SHEET_ENDPOINT === 'string' && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(KURTA_SHEET_ENDPOINT);
  async function read() {
    if (!enabled()) throw new Error('The Sheet service has not been deployed yet.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(KURTA_SHEET_ENDPOINT + '?t=' + Date.now(), {
        redirect: 'follow', cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) throw new Error('The Sheet service is unavailable.');
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'Could not read the Sheet.');
      return data;
    } finally { clearTimeout(timer); }
  }
  return { get enabled() { return enabled(); }, read };
})();
