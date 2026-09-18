/* Local review drafts only. The Google Sheet remains the shared master. */
(() => {
  const KEY = 'weddingKurta.drafts.v1';
  let drafts;
  try { drafts = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { drafts = {}; }
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) drafts = {};
  // Preserve the first PR's selections without enrolling them in cloud sync.
  for (const row of Store.list('kurtaSelections')) {
    if (!drafts[row.name]) drafts[row.name] = {url: row.url || '', ordered: false, notes: ''};
  }
  let dirty = false;
  const validURL = value => {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /\s/.test(value)) return null;
      return url.href;
    } catch { return null; }
  };
  const status = row => validURL(row.url || '') ? (row.ordered ? 'Ordered' : 'Finalized') : 'Pending';
  const selection = (name, id) => {
    const source = KURTA_SHEET_MEMBERS.find(row => row.id === id);
    return drafts[id] || (KURTA_MEMBERS.filter(row => row[0] === name).length === 1 && drafts[name]) || {url: source?.urls.length === 1 ? source.urls[0] : '', ordered: source?.ordered || false, notes: ''};
  };
  const website = value => {
    const host = new URL(value).hostname.replace(/^www\./, '');
    if (host === 'myntra.com' || host.endsWith('.myntra.com')) return 'Myntra';
    if (host === 'ajio.com' || host.endsWith('.ajio.com')) return 'Ajio';
    if (['nykaa.com','nykaafashion.com'].some(domain => host === domain || host.endsWith('.' + domain))) return 'Nykaa';
    return host;
  };
  const photoFor = url => {
    if (!validURL(url) || website(url) !== 'Myntra') return '';
    const match = new URL(url).pathname.match(/\/(\d+)(?:\/buy)?\/?$/);
    return match ? KURTA_PHOTOS[match[1]] || '' : '';
  };
  const preview = (url, label = 'Selected kurta') => {
    const photo = photoFor(url);
    return photo ? `<button type="button" class="kurta-thumb" data-preview="${esc(url)}" aria-label="Preview ${esc(label)}"><img src="${esc(photo)}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer"><span class="photo-fallback" hidden>Photo unavailable</span></button>` : `<span class="photo-unavailable">Photo not available</span>`;
  };
  function bindPhotos(root) {
    root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      img.hidden = true; img.nextElementSibling.hidden = false;
    }, {once:true}));
    root.querySelectorAll('[data-preview]').forEach(button => button.onclick = () => {
      const url = button.dataset.preview;
      $('#photoImage').src = photoFor(url);
      $('#photoImage').alt = button.getAttribute('aria-label').replace(/^Preview /, '');
      $('#photoTitle').textContent = $('#photoImage').alt;
      $('#photoProduct').href = url;
      $('#photoProduct').textContent = `Open on ${website(url)} ↗`;
      $('#photoDialog').showModal();
    });
  }

  function summary() {
    const rows = KURTA_MEMBERS.map(([name,,id]) => selection(name,id));
    const finalized = rows.filter(row => status(row) !== 'Pending').length;
    $('#kurtaProgress').textContent = `${finalized} / ${rows.length} finalized in this browser`;
    $('#finalizedCount').textContent = finalized;
    $('#pendingCount').textContent = rows.length - finalized;
    $('#orderedCount').textContent = rows.filter(row => status(row) === 'Ordered').length;
    $('#selectionProgress').value = finalized;
    $('#selectionProgress').max = rows.length;
  }
  function renderPeople() {
    const query = $('#memberSearch').value.trim().toLowerCase();
    const sizeFilter = $('#sizeFilter').value;
    const statusFilter = $('#statusFilter').value;
    let count = 0;
    const people = $('#kurtaPeople');
    people.innerHTML = KURTA_MEMBERS.map(([name, size, id], index) => {
      const row = selection(name,id), state = status(row);
      const source = KURTA_SHEET_MEMBERS.find(member => member.id === id);
      if ((query && !name.toLowerCase().includes(query)) || (sizeFilter && size !== sizeFilter) || (statusFilter && state !== statusFilter)) return '';
      count++;
      const safe = validURL(row.url || '');
      const urls = safe ? [safe] : !drafts[id] && !drafts[name] && source.urls.length > 1 ? source.urls : [];
      return `<tr class="kurta-person" data-member="${index}">
        <th scope="row"><strong>${esc(name)}</strong><span class="kurta-source">${drafts[id] || drafts[name] ? 'Browser draft' : ''}</span></th>
        <td>${esc(size || 'TBC')}</td>
        <td><div class="kurta-picks">${urls.length ? urls.map((url,i)=>`<div class="kurta-option">${preview(url, `${name}${urls.length > 1 ? ` · option ${i+1}` : '’s kurta'}`)}${urls.length>1?`<small>Option ${i+1}</small>`:''}</div>`).join('') : '<span class="muted">—</span>'}</div></td>
        <td class="kurta-websites">${urls.length ? urls.map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(website(url))}${urls.length>1?` · ${i+1}`:''} ↗</a>`).join('') : '<span class="muted">—</span>'}</td>
        <td><span class="pill ${state === 'Pending' ? '' : 'gold'}">${urls.length>1?'To confirm':state}</span></td>
        <td><button type="button" class="btn sm" data-edit="${index}" aria-label="Edit ${esc(name)}">Edit</button></td>
      </tr><tr class="kurta-edit-row" data-editor="${index}" hidden><td colspan="6">
<form data-index="${index}">
          <label for="url-${index}">Finalized link</label><input id="url-${index}" name="url" type="url" value="${esc(row.url || '')}" placeholder="Paste a product link" aria-describedby="feedback-${index}">
          <label for="notes-${index}">Notes</label><textarea id="notes-${index}" name="notes" rows="2" maxlength="1000" placeholder="Colour, fit or delivery notes">${esc(row.notes || '')}</textarea>
          <label class="kurta-check"><input name="ordered" type="checkbox" ${row.ordered ? 'checked' : ''}> Ordered</label>
          <div class="btn-row"><button class="btn primary" type="submit">Save draft</button>${safe ? `<a class="btn" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">View pick ↗</a>` : ''}</div>
          <p id="feedback-${index}" class="small kurta-feedback" role="status">Saved changes stay in this browser.</p>
        </form></td></tr>`;
    }).join('');
    $('#resultCount').textContent = `${count} of ${KURTA_MEMBERS.length} members`;
    $('#emptyResults').hidden = count !== 0;
    dirty = false;
    bindPhotos(people);
    people.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => {
      const editor = people.querySelector(`[data-editor="${button.dataset.edit}"]`);
      editor.hidden = !editor.hidden;
      button.setAttribute('aria-expanded', String(!editor.hidden));
      if (!editor.hidden) editor.querySelector('input').focus();
    });
    people.querySelectorAll('form').forEach(form => {
      form.addEventListener('input', () => {
        form.dataset.dirty = 'true'; dirty = true;
        form.querySelector('[role=status]').textContent = 'Unsaved changes';
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const [name,,id] = KURTA_MEMBERS[Number(form.dataset.index)];
        const data = new FormData(form), raw = data.get('url').trim(), url = validURL(raw);
        const feedback = form.querySelector('[role=status]');
        if (url === null) { feedback.textContent = 'Enter one valid http or https product link.'; return; }
        if (data.has('ordered') && !url) { feedback.textContent = 'Add a finalized link before marking this ordered.'; return; }
        const next = {...drafts, [id]: {url, ordered: data.has('ordered'), notes: data.get('notes').trim()}};
        try { localStorage.setItem(KEY, JSON.stringify(next)); }
        catch { feedback.textContent = 'Could not save. Browser storage is unavailable or full. Keep this page open and copy your changes.'; return; }
        drafts = next;
        form.dataset.dirty = '';
        dirty = !!people.querySelector('[data-dirty=true]');
        feedback.textContent = 'Draft saved in this browser. The shared sheet has not changed.';
        const card = people.querySelector(`[data-member="${form.dataset.index}"]`);
        card.querySelector('.kurta-picks').innerHTML = url ? preview(url) : '<p class="small muted">No kurta selected yet</p>';
        card.querySelector('.kurta-source').textContent = 'Browser draft';
        card.querySelector('.kurta-websites').innerHTML = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(website(url))} ↗</a>` : '<span class="muted">—</span>';
        bindPhotos(card);
        card.querySelector('.pill').textContent = status(next[id]);
        card.querySelector('.pill').className = `pill ${url ? 'gold' : ''}`;
        const link = form.querySelector('a');
        if (link) link.remove();
        if (url) {
          const a = document.createElement('a'); a.className = 'btn'; a.href = url;
          a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'View pick ↗';
          form.querySelector('.btn-row').append(a);
        }
        summary();
      });
    });
  }
  $('#kurtaSamples').innerHTML = KURTA_SAMPLES.map((sample, index) => `<article class="card kurta-sample">
    <div class="kurta-sample-top"><span class="pill gold">${esc(website(sample.url))}</span><span class="small muted">${String(index + 1).padStart(2, '0')}</span></div>
    <h3>${esc(sample.name)}</h3><p class="small muted">${sample.url.includes('myntra.com') ? 'Myntra' : 'Nykaa'} · Check sizes on the product page</p>
    <div class="btn-row"><a class="btn" href="${esc(sample.url)}" target="_blank" rel="noopener noreferrer">View product ↗</a><button class="btn primary" data-sample="${index}">Choose for someone</button></div>
  </article>`).join('');
  $('#sampleMember').innerHTML = KURTA_MEMBERS.map(([name, size, id], index) => `<option value="${index}">${esc(name)} · ${esc(size || 'size to confirm')}</option>`).join('');
  $('#sizeFilter').innerHTML += [...new Set(KURTA_MEMBERS.map(row => row[1]).filter(Boolean))].map(size => `<option>${esc(size)}</option>`).join('');
  function discardAllowed() { return !dirty || confirm('Discard unsaved changes before changing this view?'); }
  for (const control of ['memberSearch','sizeFilter','statusFilter']) {
    const element = $('#'+control); let previous = element.value;
    element.addEventListener('change', () => {
      if (!discardAllowed()) { element.value = previous; return; }
      previous = element.value; renderPeople();
    });
  }
  let sampleIndex = 0;
  $$('[data-sample]').forEach(button => button.onclick = () => {
    sampleIndex = Number(button.dataset.sample);
    $('#sampleTitle').textContent = KURTA_SAMPLES[sampleIndex].name;
    $('#sampleDialog').showModal();
  });
  $('#cancelSample').onclick = () => $('#sampleDialog').close();
  $('#chooseSample').onclick = () => {
    if (!discardAllowed()) return;
    const index = Number($('#sampleMember').value);
    $('#sampleDialog').close();
    $('#memberSearch').value = ''; $('#sizeFilter').value = ''; $('#statusFilter').value = '';
    renderPeople();
    const form = $(`form[data-index="${index}"]`);
    form.elements.url.value = KURTA_SAMPLES[sampleIndex].url;
    form.elements.ordered.checked = false;
    form.elements.url.dispatchEvent(new Event('input', {bubbles:true}));
    form.closest('.kurta-edit-row').hidden = false;
    form.scrollIntoView({behavior:'smooth',block:'center'}); form.elements.url.focus({preventScroll:true});
  };
  $('#exportDrafts').onclick = () => {
    const blob = new Blob([JSON.stringify({kind:'local-kurta-drafts',exportedAt:new Date().toISOString(),members:KURTA_MEMBERS.map(([name,size,id])=>({id,name,size,...selection(name,id)}))},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'kurta-drafts.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  $('a[href="#samples"]').onclick = () => { $('#sampleShortlist').open = true; };
  $('#closePhoto').onclick = () => $('#photoDialog').close();
  summary(); renderPeople();
})();
