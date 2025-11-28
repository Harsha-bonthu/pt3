const base = "/api";

function setToken(t){localStorage.setItem('pt3_token', t)}
function getToken(){return localStorage.getItem('pt3_token')}
function authHeaders(){const t=getToken(); return t?{ 'Authorization': 'Bearer '+t, 'Content-Type':'application/json'}:{'Content-Type':'application/json'}}

async function post(path, body){
  const r = await fetch(base+path, {method:'POST', headers:authHeaders(), body: JSON.stringify(body)})
  return r.json();
}

function openModal(html){
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalInner');
  // save previously focused element to restore focus on close
  window._pt3_prev_focus = document.activeElement
  content.innerHTML = html;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false')
  // focus the inner container for accessibility
  content.focus()
  // attach close handlers
  modal.querySelectorAll('.close').forEach(b=>b.onclick = ()=> closeModal())
  // attach key handlers for Escape and focus trap
  document.addEventListener('keydown', _pt3_modal_keydown)
}

function closeModal(){
  const modal = document.getElementById('modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true')
  document.getElementById('modalInner').innerHTML='';
  // remove key handlers
  document.removeEventListener('keydown', _pt3_modal_keydown)
  // restore previous focus
  try{ if(window._pt3_prev_focus && window._pt3_prev_focus.focus) window._pt3_prev_focus.focus() }catch(e){}
}

function _pt3_modal_keydown(e){
  const modal = document.getElementById('modal');
  if(!modal.classList.contains('show')) return
  // Escape closes
  if(e.key === 'Escape'){
    e.preventDefault(); closeModal(); return
  }
  // Basic focus trap: keep TAB within modalInner
  if(e.key === 'Tab'){
    const container = document.getElementById('modalInner')
    const focusable = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')
    if(!focusable || focusable.length===0){ e.preventDefault(); container.focus(); return }
    const first = focusable[0], last = focusable[focusable.length-1]
    if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  }
}

async function get(path){
  const r = await fetch(base+path, {method:'GET', headers:authHeaders()});
  return r.json();
}

document.getElementById('btn-reg').onclick = async ()=>{
  const u=document.getElementById('reg-user').value, p=document.getElementById('reg-pass').value
  const res = await post('/register',{username:u,password:p})
  if(res.id){alert('Registered, please login.')}
  else alert(res.detail||JSON.stringify(res))
}

document.getElementById('btn-login').onclick = async ()=>{
  const u=document.getElementById('login-user').value, p=document.getElementById('login-pass').value
  const res = await post('/login',{username:u,password:p})
  if(res.access_token){setToken(res.access_token); showApp(); loadItems(); loadStats()}
  else alert(res.detail||JSON.stringify(res))
}

async function loadMeAndSetup(){
  try{
    const me = await get('/me')
    if(me && me.role === 'admin'){
      document.getElementById('btn-admin').style.display='inline-block'
    }
  }catch(e){/* ignore */}
}

document.getElementById('btn-logout').onclick = ()=>{localStorage.removeItem('pt3_token');showAuth()}
document.getElementById('btn-admin').onclick = async ()=>{
  const users = await get('/admin/users')
  let html = '<button class="close">Close</button><h3>Admin — Users</h3><div><button id="view-audit">View Audit</button></div><div class="admin-list">'
  users.forEach(u=>{
    html += `<div style="border-bottom:1px solid #eee">${u.id} — ${u.username} — role: <select data-user="${u.id}"><option value="user">user</option><option value="admin">admin</option></select> <button data-save="${u.id}">Save</button></div>`
  })
  html += '</div>'
  openModal(html)
  // set selects
  users.forEach(u=>{ const sel = document.querySelector(`select[data-user="${u.id}"]`); if(sel) sel.value = u.role || 'user'; })
  // attach saves
  users.forEach(u=>{ const btn = document.querySelector(`button[data-save="${u.id}"]`); if(btn) btn.onclick = async ()=>{
      const sel = document.querySelector(`select[data-user="${u.id}"]`)
      const role = sel.value
      const r = await fetch(base+`/admin/users/${u.id}`, {method:'PUT', headers: authHeaders(), body: JSON.stringify({role})})
      if(r.ok){ alert('Updated'); const us = await get('/admin/users'); /* refresh modal */ openModal('<button class="close">Close</button><h3>Saved</h3>') }
      else alert('Update failed')
  }})
  // view audit
  const va = document.getElementById('view-audit')
  if(va) va.onclick = async ()=>{
    let page = 1, per = 10
    let q = ''
    function renderServerAudit(){
      get(`/admin/audit?q=${encodeURIComponent(q)}&limit=${per}&offset=${(page-1)*per}`).then(res=>{
        const items = res.items || []
        const total = res.total || 0
        const totalPages = Math.max(1, Math.ceil(total / per))
        let ah = '<button class="close">Close</button><h3>Audit Log</h3>'
        ah += '<div style="margin-bottom:8px"><input id="audit-filter" placeholder="Filter by actor or action" style="width:60%" value="' + (q||'') + '" /><button id="audit-clear" class="btn ghost">Clear</button></div>'
        ah += '<div id="audit-list" style="max-height:360px;overflow:auto"></div>'
        ah += '<div id="audit-pager" style="margin-top:8px;display:flex;gap:8px;align-items:center"></div>'
        openModal(ah)
        const list = document.getElementById('audit-list')
        list.innerHTML = ''
        if(items.length===0) list.innerHTML = '<div style="padding:8px">(no audit entries)</div>'
        items.forEach(a=>{ const row = document.createElement('div'); row.style.padding='8px'; row.style.borderBottom='1px solid rgba(255,255,255,0.03)'; row.innerHTML = `${a.created_at} — <strong>${a.actor}</strong> — ${a.action} — ${a.target} <div style="color:var(--muted)">${a.detail||''}</div>`; list.appendChild(row) })
        const pager = document.getElementById('audit-pager')
        pager.innerHTML = ''
        const prev = document.createElement('button'); prev.className='btn'; prev.textContent='Prev'; prev.disabled = page<=1; prev.onclick = ()=>{ page--; renderServerAudit() }
        const next = document.createElement('button'); next.className='btn'; next.textContent='Next'; next.disabled = page>=totalPages; next.onclick = ()=>{ page++; renderServerAudit() }
        const label = document.createElement('div'); label.style.color='var(--muted)'; label.textContent = `Page ${page} / ${totalPages}`
        pager.appendChild(prev); pager.appendChild(label); pager.appendChild(next)
        const filterInput = document.getElementById('audit-filter')
        if(filterInput) filterInput.oninput = ()=>{ q = filterInput.value; page = 1; renderServerAudit() }
        const clearBtn = document.getElementById('audit-clear')
        if(clearBtn) clearBtn.onclick = ()=>{ if(filterInput) filterInput.value=''; q=''; page=1; renderServerAudit() }
      })
    }
    renderServerAudit()
  }
}

document.getElementById('btn-add').onclick = async ()=>{
  const title=document.getElementById('item-title').value||'Untitled'
  const category=document.getElementById('item-category').value||'general'
  const description=document.getElementById('item-desc').value||''
  // create item first
  const res = await post('/items',{title,category,description})
  if(res.id){
    const fileInput = document.getElementById('item-file')
    if(fileInput && fileInput.files && fileInput.files.length>0){
      const f = fileInput.files[0]
      const form = new FormData();
      form.append('file', f)
      const token = getToken()
      await fetch(base+`/items/${res.id}/upload-multipart`, {method:'POST', headers: token?{'Authorization':'Bearer '+token}:undefined, body: form})
    }
    document.getElementById('item-title').value='';document.getElementById('item-category').value='';document.getElementById('item-desc').value='';document.getElementById('item-file').value=''
    showToast('Item added')
    loadItems(1);loadStats()
  } else alert(JSON.stringify(res))
}

document.getElementById('btn-clear').onclick = ()=>{document.getElementById('item-title').value='';document.getElementById('item-category').value='';document.getElementById('item-desc').value='';document.getElementById('item-file').value=''; showToast('Cleared')}

function showApp(){document.getElementById('auth').style.display='none';document.getElementById('app').style.display='block'}
function showAuth(){document.getElementById('auth').style.display='block';document.getElementById('app').style.display='none'}

const PAGE_SIZE = 6
window._pt3_page = 1
async function loadItems(page=1){
  window._pt3_page = page
  const offset = (page-1)*PAGE_SIZE
  const items = await get(`/items?limit=${PAGE_SIZE}&offset=${offset}`)
  const container = document.getElementById('items'); container.innerHTML=''
  if(Array.isArray(items)){
    items.forEach(it=>{
      const card = document.createElement('div'); card.className='item-card'
      const thumb = document.createElement('div'); thumb.className='item-thumb'
      if(it.file_url && (it.file_url.match(/\.(jpg|jpeg|png|gif)$/i))){
        const img = document.createElement('img'); img.src = it.file_url; img.style.width='72px'; img.style.height='72px'; img.style.objectFit='cover'; img.style.borderRadius='8px'; thumb.appendChild(img)
      } else {
        thumb.textContent = (it.title||'').slice(0,2).toUpperCase()
      }
      const meta = document.createElement('div'); meta.className='item-meta'
      const t = document.createElement('div'); t.className='item-title'; t.textContent = it.title + ' • ' + it.category
      const d = document.createElement('div'); d.className='item-desc'; d.textContent = it.description || ''
      const actions = document.createElement('div'); actions.className='item-actions'
      const edit = document.createElement('button'); edit.className='btn ghost'; edit.textContent='Edit'; edit.onclick = ()=> showEditModal(it)
      const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Delete'; del.onclick = async ()=>{
        if(!confirm('Delete this item?')) return;
        const r = await fetch(base+`/items/${it.id}`, {method:'DELETE', headers:authHeaders()});
        if(r.ok){ showToast('Deleted'); loadItems(window._pt3_page); loadStats() } else showToast('Delete failed')
      }
      const commentBtn = document.createElement('button'); commentBtn.className='btn ghost'; commentBtn.textContent='Comments'; commentBtn.onclick = ()=> showCommentsModal(it)
      if(it.file_url && !thumb.querySelector('img')){
        const a = document.createElement('a'); a.href = it.file_url; a.textContent = 'View'; a.target = '_blank'; a.style.marginLeft='8px'; actions.appendChild(a)
      }
      actions.appendChild(edit); actions.appendChild(del); actions.appendChild(commentBtn)
      meta.appendChild(t); meta.appendChild(d); meta.appendChild(actions)
      card.appendChild(thumb); card.appendChild(meta)
      container.appendChild(card)
    })
    renderPager(items.length === PAGE_SIZE)
  } else console.error(items)
}

function renderPager(hasMore){
  const pager = document.getElementById('pager'); pager.innerHTML=''
  const prev = document.createElement('button'); prev.className='btn'; prev.textContent='Prev'; prev.disabled = window._pt3_page<=1; prev.onclick = ()=>{ if(window._pt3_page>1) loadItems(window._pt3_page-1) }
  const next = document.createElement('button'); next.className='btn'; next.textContent='Next'; next.disabled = !hasMore; next.onclick = ()=>{ if(hasMore) loadItems(window._pt3_page+1) }
  const pageLabel = document.createElement('div'); pageLabel.style.color='var(--muted)'; pageLabel.textContent = `Page ${window._pt3_page}`
  pager.appendChild(prev); pager.appendChild(pageLabel); pager.appendChild(next)
}

function showToast(msg, timeout=3000){
  try{
    const container = document.getElementById('toast-container')
    const t = document.createElement('div'); t.className='toast'; t.textContent = msg
    container.appendChild(t)
    setTimeout(()=>{ t.remove() }, timeout)
  }catch(e){console.log(msg)}
}

function showEditModal(it){
  const html = `
    <button class="close">Close</button>
    <h3>Edit Item</h3>
    <form id="edit-form">
      <input id="e-title" placeholder="Title" value="${it.title||''}" />
      <input id="e-cat" placeholder="Category" value="${it.category||''}" />
      <textarea id="e-desc" placeholder="Description">${it.description||''}</textarea>
      <button type="submit">Save</button>
    </form>
  `
  openModal(html)
  document.getElementById('edit-form').onsubmit = async (e)=>{
    e.preventDefault();
    const title = document.getElementById('e-title').value
    const category = document.getElementById('e-cat').value
    const description = document.getElementById('e-desc').value
    const r = await fetch(base+`/items/${it.id}`, {method:'PUT', headers:authHeaders(), body: JSON.stringify({title,category,description})})
    if(r.ok){ closeModal(); loadItems(); loadStats() } else alert('Update failed')
  }
}

async function showCommentsModal(it){
  const comments = await get(`/items/${it.id}/comments`)
  let html = '<button class="close">Close</button>'
  html += `<h3>Comments for ${it.title}</h3>`
  html += '<div class="comments">'
  if(Array.isArray(comments) && comments.length>0){ comments.forEach(c=> html += `<div class="comment">${c.content}<br/><small>${new Date(c.created_at).toLocaleString()}</small></div>`) }
  else html += '<div class="comment">(no comments)</div>'
  html += '</div>'
  html += '<h4>Add comment</h4><form id="comment-form"><textarea id="c-content" placeholder="Comment"></textarea><button type="submit">Add</button></form>'
  openModal(html)
  document.getElementById('comment-form').onsubmit = async (e)=>{
    e.preventDefault();
    const content = document.getElementById('c-content').value
    if(!content) return alert('Enter comment')
    const res = await post(`/items/${it.id}/comments`, {content})
    if(res && res.id){ closeModal(); loadItems() } else alert('Failed')
  }
}

let chart=null
async function loadStats(){
  const stats = await get('/stats')
  if(stats && typeof stats==='object'){
    const labels = Object.keys(stats)
    const values = labels.map(l=>stats[l])
    const ctx = document.getElementById('chart').getContext('2d')
    if(chart) chart.destroy()
    // default chart type can be toggled by the button
    const currentType = window._pt3_chart_type || 'bar'
    chart = new Chart(ctx, {
      type: currentType,
      data:{labels, datasets:[{label:'Items',data:values,backgroundColor:'rgba(37,99,235,0.7)'}]},
      options: {
        onClick: async (evt, elems) => {
          if(!elems || elems.length===0) return
          const idx = elems[0].index
          const label = labels[idx]
          // fetch items in this category and show modal
          const items = await get(`/items?q=${encodeURIComponent(label)}`)
          let html = '<button class="close">Close</button>'
          html += `<h3>Items in ${label}</h3>`
          if(Array.isArray(items) && items.length>0){ items.forEach(it=> html += `<div style="padding:8px;border-bottom:1px solid #eee">${it.title} — ${it.description||''} <br/><small>${it.created_at}</small></div>`)} else html += '<div>(no items)</div>'
          openModal(html)
        }
      }
    })
  }
}

// toggle chart type
document.getElementById('btn-toggle-chart').onclick = ()=>{
  window._pt3_chart_type = window._pt3_chart_type === 'pie' ? 'bar' : 'pie'
  loadStats()
}

// On load
if(getToken()){showApp(); loadItems(); loadStats()} else showAuth()
// try to fetch profile and show admin link
loadMeAndSetup()
