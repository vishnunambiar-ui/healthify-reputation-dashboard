let DATA = null;

const fmt = new Intl.NumberFormat();
function n(v) { return v === null || v === undefined || v === '' ? 'N/A' : fmt.format(v); }
function rating(v) { return v === null || v === undefined || v === '' ? 'N/A' : Number(v).toFixed(2); }

function filters() {
  return {
    region: document.querySelector('#region-filter').value,
    source: document.querySelector('#source-filter').value,
    query: document.querySelector('#query').value.trim().toLowerCase(),
  };
}

function visibleReviews() {
  const f = filters();
  return DATA.reviews.filter(r => {
    if (f.region !== 'All' && r.region_bucket !== f.region) return false;
    if (f.source !== 'All' && r.source !== f.source) return false;
    if (f.query && !`${r.title || ''} ${r.content || ''} ${r.theme_primary || ''}`.toLowerCase().includes(f.query)) return false;
    return true;
  });
}

function visibleSources() {
  const f = filters();
  return DATA.sources.filter(s => {
    if (f.region !== 'All' && s.region_bucket !== f.region) return false;
    if (f.source !== 'All' && s.source !== f.source) return false;
    return true;
  });
}

function renderStats(reviews, sources) {
  const ratings = reviews.map(r => Number(r.rating)).filter(Boolean);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const negative = ratings.filter(v => v <= 2).length;
  const storeRatings = sources.map(s => Number(s.rating)).filter(Boolean);
  const storeAvg = storeRatings.length ? storeRatings.reduce((a, b) => a + b, 0) / storeRatings.length : null;
  const ratingCount = sources.reduce((sum, s) => sum + (Number(s.rating_count) || 0), 0);
  document.querySelector('#status-row').innerHTML = `
    <div class="stat"><span>Reviews Captured</span><strong>${n(reviews.length)}</strong></div>
    <div class="stat"><span>Store Avg Rating</span><strong>${rating(storeAvg)}</strong></div>
    <div class="stat"><span>Store Rating Count</span><strong>${n(ratingCount)}</strong></div>
    <div class="stat"><span>1-2 Star Share</span><strong>${ratings.length ? Math.round((negative / ratings.length) * 100) : 0}%</strong></div>
  `;
}

function renderSources(rows) {
  document.querySelector('#source-table tbody').innerHTML = rows.map(s => `
    <tr><td>${s.source}</td><td>${s.region_label}</td><td>${rating(s.rating)}</td><td>${n(s.rating_count)}</td><td>${n(s.review_count)}</td><td>${s.install_band || s.note || ''}</td></tr>
  `).join('');
}

function renderRatings(reviews) {
  const counts = {1:0,2:0,3:0,4:0,5:0};
  reviews.forEach(r => { const v = Number(r.rating); if (counts[v] !== undefined) counts[v] += 1; });
  const max = Math.max(1, ...Object.values(counts));
  document.querySelector('#rating-bars').innerHTML = [5,4,3,2,1].map(star => `
    <div class="bar-row"><strong>${star} star</strong><div class="bar-track"><div class="bar-fill" style="width:${(counts[star]/max)*100}%"></div></div><span>${counts[star]}</span></div>
  `).join('');
}

function renderThemes(reviews) {
  const counts = {};
  reviews.forEach(r => { counts[r.theme_primary || 'General'] = (counts[r.theme_primary || 'General'] || 0) + 1; });
  const chips = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 14);
  document.querySelector('#theme-chips').innerHTML = chips.map(([k,v]) => `<span class="chip">${k} (${v})</span>`).join('') || '<p class="empty">No theme data.</p>';
}

function renderVisuals() {
  const images = [];
  DATA.visuals.forEach(v => {
    if (v.icon) images.push(`<img class="icon" src="${v.icon}" alt="${v.source} icon" loading="lazy">`);
    (v.screenshots || []).slice(0, 6).forEach(url => images.push(`<img src="${url}" alt="${v.source} screenshot" loading="lazy">`));
  });
  document.querySelector('#visuals').innerHTML = images.join('') || '<p class="empty">No public store visuals available.</p>';
}

function renderReviews(reviews) {
  document.querySelector('#reviews').innerHTML = reviews.slice(0, 350).map(r => `
    <article class="review"><header><div><strong>${r.title || 'Untitled review'}</strong><div class="meta">${r.source} - ${r.region_label} - ${r.date || 'No date'} - ${r.author || 'Anonymous'}</div></div><span class="badge">${r.rating || 'N/A'} star</span></header><p>${r.content || ''}</p><div class="meta">${r.theme_primary || 'General'}</div></article>
  `).join('') || '<div class="empty">No reviews match the current filters.</div>';
}

function render() {
  const reviews = visibleReviews();
  const sources = visibleSources();
  renderStats(reviews, sources);
  renderSources(sources);
  renderRatings(reviews);
  renderThemes(reviews);
  renderVisuals();
  renderReviews(reviews);
}

fetch('data/dashboard_data.json').then(r => r.json()).then(data => {
  DATA = data;
  document.querySelector('#generated-at').textContent = `Updated ${data.generated_at}`;
  ['#region-filter', '#source-filter', '#query'].forEach(sel => document.querySelector(sel).addEventListener('input', render));
  render();
});
