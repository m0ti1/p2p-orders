const icons = {
  back: '<svg viewBox="0 0 24 24"><path d="m15 4-8 8 8 8M7 12h12"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="4" width="11" height="13" rx="2"/><path d="M16 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v13H8l-4 3V5Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>'
};

const initialOrders = [
  { id: '2063997601296216064', type: 'Покупка', crypto: 'USDT', fiat: 600, rate: 78, user: 'Tarik-BTC', date: '2026-06-08T18:52:31', status: 'Завершенно', unread: 2 },
  { id: '2062323214670651392', type: 'Продажа', crypto: 'USDT', fiat: 20000, rate: 73.79, user: 'PUDGE', date: '2026-06-04T03:59:06', status: 'Завершенно', unread: 2 },
  { id: '2059194161304788992', type: 'Продажа', crypto: 'USDT', fiat: 22700, rate: 75.05, user: '28_FAMILY_🦁', date: '2026-05-26T12:45:21', status: 'Завершенно', unread: 0 },
  { id: '2055447129001942017', type: 'Покупка', crypto: 'USDT', fiat: 500, rate: 80.1, user: 'NATASHA', date: '2026-05-16T10:21:04', status: 'Отменено', unread: 1 },
  { id: '2053110456789362011', type: 'Продажа', crypto: 'BTC', fiat: 125000, rate: 7300000, user: 'Crypto_Garage', date: '2026-05-11T14:08:42', status: 'Отменено', unread: 0 },
  { id: '2070110456789362022', type: 'Покупка', crypto: 'ETH', fiat: 45000, rate: 281250, user: 'NATASHA', date: '2026-06-18T10:15:00', status: 'Активен', unread: 3 }
];

const storageKey = 'p2p-orders-data';

function loadOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [...initialOrders];
  } catch {
    return [...initialOrders];
  }
}

function saveOrders() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(orders));
  } catch {
    // The prototype still works for the current session when storage is unavailable.
  }
}

let orders = loadOrders();
let currentMode = 'history';
let currentStatus = 'Отменено';
let selectedOrder = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));
const ordersList = $('#ordersList');
const emptyState = $('#emptyState');
const sheet = $('#orderSheet');
const backdrop = $('#backdrop');
const orderForm = $('#orderForm');
const manageOrdersList = $('#manageOrdersList');

function formatFiat(number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function formatCrypto(number, crypto) {
  const digits = crypto === 'USDT' ? 4 : 6;
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number);
}

function formatDate(value) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function cardTemplate(order) {
  const cryptoAmount = order.fiat / order.rate;
  const isDone = order.status === 'Завершенно';
  const safeUser = escapeHtml(order.user);
  return `
    <article class="order-card" data-id="${order.id}" tabindex="0" aria-label="${order.type} ${order.crypto}, ${order.status}">
      <div class="order-heading">
        <span class="order-kind ${order.type === 'Покупка' ? 'buy' : 'sell'}">${order.type} <b>${order.crypto}</b></span>
        <span class="order-status ${isDone ? 'done' : ''}">${order.status}<i>›</i></span>
      </div>
      <div class="data-row"><span class="label">Сумма</span><span class="value">${formatFiat(order.fiat)} RUB</span></div>
      <div class="data-row"><span class="label">Цена</span><span class="value">${formatFiat(order.rate)} RUB</span></div>
      <div class="data-row"><span class="label">Сумма</span><span class="value">${formatCrypto(cryptoAmount, order.crypto)} ${order.crypto}</span></div>
      <div class="data-row order-number"><span class="label">Ордер №</span><span class="value">${order.id}<button class="copy-button" data-copy="${order.id}" aria-label="Копировать номер">${icons.copy}</button></span></div>
      <div class="order-footer">
        <span class="user-pill">${icons.chat}<span>${safeUser}</span>${order.unread ? `<span class="badge">${order.unread}</span>` : ''}</span>
        <time class="order-date">${formatDate(order.date)}</time>
      </div>
    </article>`;
}

function renderOrders() {
  const visible = orders.filter(order => {
    if (currentMode === 'active') return order.status === 'Активен';
    if (order.status === 'Активен') return false;
    return currentStatus === 'all' || order.status === currentStatus;
  });
  ordersList.innerHTML = visible.map(cardTemplate).join('');
  emptyState.hidden = visible.length > 0;
  renderOrderManager();
}

function manageOrderTemplate(order) {
  const safeUser = escapeHtml(order.user);
  return `
    <article class="manage-order">
      <div class="manage-order-info">
        <div class="manage-order-title ${order.type === 'Покупка' ? 'buy' : 'sell'}">${order.type} <b>${order.crypto}</b></div>
        <p>${safeUser} · ${formatFiat(order.fiat)} RUB · ${formatDate(order.date)}</p>
      </div>
      <button class="delete-order" type="button" data-delete-id="${order.id}" aria-label="Удалить ордер ${order.id}">${icons.trash}</button>
    </article>`;
}

function renderOrderManager() {
  $('#manageOrdersCount').textContent = `${orders.length} шт.`;
  manageOrdersList.innerHTML = orders.length
    ? orders.map(manageOrderTemplate).join('')
    : '<p class="manage-empty">Список пуст. Добавьте новый ордер выше.</p>';
}

function setMode(mode) {
  currentMode = mode;
  $$('.primary-tabs button').forEach(button => button.classList.toggle('selected', button.dataset.mode === mode));
  $('.status-tabs').style.visibility = mode === 'active' ? 'hidden' : 'visible';
  renderOrders();
}

function setStatus(status) {
  currentStatus = status;
  $$('.status-tabs button').forEach(button => button.classList.toggle('selected', button.dataset.status === status));
  renderOrders();
}

function setDefaultDate() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  orderForm.elements.date.value = now.toISOString().slice(0, 16);
}

function toggleSheet(open) {
  sheet.classList.toggle('open', open);
  backdrop.classList.toggle('visible', open);
  sheet.setAttribute('aria-hidden', String(!open));
  $('#shareButton').setAttribute('aria-expanded', String(open));
  if (open) renderOrderManager();
  if (open) setTimeout(() => orderForm.elements.type.focus(), 350);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 1800);
}

function detailTemplate(order) {
  const cryptoAmount = order.fiat / order.rate;
  return `
    <header class="sub-header">
      <div class="sub-title-row"><button class="icon-button detail-back" aria-label="Назад">${icons.back}</button><h1>Справочный центр P2P</h1></div>
    </header>
    <div class="detail-content">
      <h2 class="detail-result">${order.status === 'Завершенно' ? 'Завершён' : order.status}</h2>
      <p class="detail-received">${order.type === 'Покупка' ? 'Получено' : 'Продано'} ${formatCrypto(cryptoAmount, order.crypto)} ${order.crypto}</p>
      <div class="info-note">Этот ордер завершён, и активы больше не заблокированы. Не следует слепо доверять незнакомцам или отправлять средства без подтверждения.</div>
      <div class="deal-heading"><strong>${order.type} ${order.crypto}</strong><button class="contact-button">Связаться с продавцом</button></div>
      <div class="detail-table">
        <div class="data-row"><span class="label">Сумма</span><span class="value">${formatFiat(order.fiat)} RUB</span></div>
        <div class="data-row"><span class="label">Цена</span><span class="value">${formatFiat(order.rate)} RUB</span></div>
        <div class="data-row"><span class="label">Общее количество</span><span class="value">${formatCrypto(cryptoAmount, order.crypto)} ${order.crypto}</span></div>
        <div class="data-row"><span class="label">Комиссии за транзакции</span><span class="value">0 ${order.crypto}</span></div>
        <div class="data-row"><span class="label">Ордер №</span><span class="value">${order.id}</span></div>
        <div class="data-row"><span class="label">Время ордера</span><span class="value">${formatDate(order.date)}</span></div>
      </div>
      <div class="payment"><span>Способ оплаты</span><strong>Bank Transfer</strong></div>
      <div class="rating"><h2>Мой рейтинг</h2><div class="rating-chip"><i>♧</i> Хорошо</div></div>
    </div>`;
}

function openDetail(order) {
  selectedOrder = order;
  const detail = $('#detailScreen');
  detail.innerHTML = detailTemplate(order);
  detail.classList.add('visible');
  detail.setAttribute('aria-hidden', 'false');
}

function closeScreen(screen) {
  screen.classList.remove('visible');
  screen.setAttribute('aria-hidden', 'true');
}

function chatTemplate(order) {
  const amount = order.fiat / order.rate;
  const safeUser = escapeHtml(order.user);
  return `
    <header class="sub-header">
      <div class="sub-title-row">
        <button class="icon-button chat-back" aria-label="Назад">${icons.back}</button>
        <div class="chat-user"><h1>${safeUser}</h1><span>ПРОДАВЕЦ · В СЕТИ</span></div><div class="chat-actions">☆ ···</div>
      </div>
    </header>
    <div class="chat-scroll" id="chatScroll">
      <p class="chat-date">${formatDate(order.date).slice(5,16)}</p>
      <div class="chat-order">
        <div class="chat-order-top"><span>${order.status === 'Завершенно' ? 'Завершён' : order.status}</span><span>Подробнее ›</span></div>
        <div class="chat-order-number">Ордер №${order.id}</div>
        <div class="chat-order-deal">${order.type} <span>${order.crypto}/RUB</span></div>
        <div class="chat-order-summary"><span>Общее количество</span><b>${formatCrypto(amount, order.crypto)} ${order.crypto}</b><span>Сумма</span><b>${formatFiat(order.fiat)} RUB</b><span>Комиссии за транзакции</span><b>0 ${order.crypto}</b><span>Способ оплаты</span><b>Bank Transfer</b></div>
      </div>
      <div class="message-row"><div class="avatar">${escapeHtml(order.user.charAt(0).toUpperCase())}</div><div class="message-wrap"><div class="sender">${safeUser} (Продавец)</div><div class="bubble">Здравствуйте! Ордер уже обработан. Если у вас остались вопросы, напишите сюда — я отвечу.</div></div></div>
      <div class="system-message">🔈 Ордер успешно создан. <b>Важно:</b> платёжные реквизиты могут отличаться для каждого ордера. Проверяйте данные перед переводом.</div>
      <div id="messages"></div>
    </div>
    <form class="chat-compose" id="chatForm"><input name="message" autocomplete="off" placeholder="Введите сообщение" aria-label="Сообщение"><button class="compose-button" type="button" aria-label="Добавить">＋</button><button class="compose-button send-button" type="submit" aria-label="Отправить"><svg viewBox="0 0 24 24"><path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15"/></svg></button></form>`;
}

function openChat(order) {
  const chat = $('#chatScreen');
  chat.innerHTML = chatTemplate(order);
  chat.classList.add('visible');
  chat.setAttribute('aria-hidden', 'false');
}

ordersList.addEventListener('click', event => {
  const copy = event.target.closest('.copy-button');
  if (copy) {
    event.stopPropagation();
    navigator.clipboard?.writeText(copy.dataset.copy);
    showToast('Номер ордера скопирован');
    return;
  }
  const card = event.target.closest('.order-card');
  if (card) openDetail(orders.find(order => order.id === card.dataset.id));
});

ordersList.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.order-card')) {
    event.preventDefault();
    openDetail(orders.find(order => order.id === event.target.dataset.id));
  }
});

$('.primary-tabs').addEventListener('click', event => {
  const button = event.target.closest('button[data-mode]');
  if (button) setMode(button.dataset.mode);
});

$('.status-tabs').addEventListener('click', event => {
  const button = event.target.closest('button[data-status]');
  if (button) setStatus(button.dataset.status);
});

$('#shareButton').addEventListener('click', () => toggleSheet(true));
$('#closeSheet').addEventListener('click', () => toggleSheet(false));
backdrop.addEventListener('click', () => toggleSheet(false));

manageOrdersList.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-id]');
  if (!button) return;
  const id = button.dataset.deleteId;
  const deletedOrder = orders.find(order => order.id === id);
  if (!deletedOrder) return;
  orders = orders.filter(order => order.id !== id);
  saveOrders();
  renderOrders();
  if (selectedOrder?.id === id) {
    selectedOrder = null;
    closeScreen($('#chatScreen'));
    closeScreen($('#detailScreen'));
  }
  showToast(`Ордер ${deletedOrder.crypto} удалён`);
});

orderForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(orderForm);
  const id = String(Date.now()) + String(Math.floor(Math.random() * 900) + 100);
  const newOrder = {
    id,
    type: data.get('type'),
    crypto: data.get('crypto'),
    fiat: Number(data.get('fiat')),
    rate: Number(data.get('rate')),
    user: data.get('user').trim(),
    date: data.get('date'),
    status: data.get('status'),
    unread: 0
  };
  orders.unshift(newOrder);
  saveOrders();
  currentMode = 'history';
  currentStatus = newOrder.status;
  $$('.primary-tabs button').forEach(button => button.classList.toggle('selected', button.dataset.mode === 'history'));
  $('.status-tabs').style.visibility = 'visible';
  $$('.status-tabs button').forEach(button => button.classList.toggle('selected', button.dataset.status === currentStatus));
  renderOrders();
  orderForm.reset();
  setDefaultDate();
  toggleSheet(false);
  ordersList.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Новый ордер добавлен');
});

$('#detailScreen').addEventListener('click', event => {
  if (event.target.closest('.detail-back')) closeScreen($('#detailScreen'));
  if (event.target.closest('.contact-button')) openChat(selectedOrder);
});

$('#chatScreen').addEventListener('click', event => {
  if (event.target.closest('.chat-back')) closeScreen($('#chatScreen'));
});

$('#chatScreen').addEventListener('submit', event => {
  if (!event.target.matches('#chatForm')) return;
  event.preventDefault();
  const input = event.target.elements.message;
  const message = input.value.trim();
  if (!message) return;
  $('#messages').insertAdjacentHTML('beforeend', `<div class="own-message"><div class="bubble"></div></div>`);
  $('#messages .own-message:last-child .bubble').textContent = message;
  input.value = '';
  $('#chatScroll').scrollTo({ top: $('#chatScroll').scrollHeight, behavior: 'smooth' });
});

$('#filterButton').addEventListener('click', () => {
  const next = currentStatus === 'all' ? 'Завершенно' : currentStatus === 'Завершенно' ? 'Отменено' : 'all';
  setStatus(next);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (sheet.classList.contains('open')) toggleSheet(false);
  else if ($('#chatScreen').classList.contains('visible')) closeScreen($('#chatScreen'));
  else if ($('#detailScreen').classList.contains('visible')) closeScreen($('#detailScreen'));
});

setDefaultDate();
renderOrders();
