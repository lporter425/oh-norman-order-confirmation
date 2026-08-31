const UTM = 'utm_source=shopify_email&utm_medium=email&utm_campaign=order_confirmation';
const onUrl = (url, content) => `${url}${url.includes('?') ? '&' : '?'}${UTM}&utm_content=${content}`;
const FONT_HEADLINE = '"SharpGroteskBold", "Open Sans", Arial, sans-serif';
const FONT_SUBHEAD = '"SharpGroteskMedium", "Open Sans", Arial, sans-serif';
const FONT_BODY = '"SharpSans-Book", "Open Sans", Arial, sans-serif';
const CREAM_TEXT = '#F3EDE1';
const LOGO_URL = 'https://cdn.shopify.com/s/files/1/0790/2049/1041/files/Layer_1-2.png';

const LINKS = {
  shop: onUrl('https://ohnorman.com', 'shop'),
  contact: onUrl('https://ohnorman.com/pages/contact', 'contact'),
  faqs: onUrl('https://ohnorman.com/pages/faqs-1', 'faqs'),
  rescue: onUrl('https://ohnorman.com/pages/about-us-1', 'gives_back'),
  dog: onUrl('https://ohnorman.com/collections/our-dog-products', 'dog'),
  cat: onUrl('https://ohnorman.com/collections/our-cat-products', 'cat'),
  gift: onUrl('https://ohnorman.com/collections/gift-cards', 'gift_card'),
  privacy: onUrl('https://ohnorman.com/policies/privacy-policy', 'privacy'),
  terms: onUrl('https://ohnorman.com/policies/terms-of-service', 'terms'),
  instagram: onUrl('https://www.instagram.com/ohnorman/', 'instagram'),
  tiktok: onUrl('https://www.tiktok.com/@oh_norman_', 'tiktok'),
  facebook: onUrl('https://www.facebook.com/ohnorman/', 'facebook')
};

let ICONS = { facebook: '', tiktok: '', instagram: '' };
let MASCOT_URL = 'https://cdn.shopify.com/s/files/1/0790/2049/1041/files/oh-norman-mascot-cream-peeking.png';

const FALLBACK = { orderNumber: '87897', firstName: 'Customer', currency: 'USD', lineItems: [], total: null };

function money(amount, currency) {
  if (amount == null || amount === '') return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount));
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderLineItem(item, currency) {
  const imgCell = item.image
    ? `<td valign="top" width="76" style="width:76px;padding:0 12px 0 0;"><img src="${escapeHtml(item.image)}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;border:0;"></td>`
    : `<td valign="top" width="76" style="width:76px;padding:0 12px 0 0;">&nbsp;</td>`;
  const variantLine = item.variant && item.variant !== 'Default Title'
    ? `<br><span>${escapeHtml(item.variant)}</span>`
    : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" class="on-line-item" style="margin:0 0 16px;"><tr>
    ${imgCell}
    <td valign="top" style="font-family:${FONT_BODY};color:#960000;font-size:14px;line-height:1.4;">
      <strong style="font-family:${FONT_SUBHEAD};color:#960000;font-size:15px;font-weight:500;">${escapeHtml(item.title)}</strong>${variantLine}
      <div style="margin:8px 0 0;">&middot;&nbsp;Qty ${item.quantity} &times; ${money(item.unitPrice, currency)}</div>
    </td>
    <td valign="top" align="right" style="font-family:${FONT_BODY};color:#960000;font-size:14px;white-space:nowrap;padding-left:8px;">${money(item.lineTotal, currency)}</td>
  </tr></table>`;
}

function summaryRow(label, value, isTotal = false) {
  if (isTotal) {
    const totalStyle = "font-family:'SharpGroteskBold', 'Open Sans', Arial, sans-serif !important;color:#960000 !important;font-size:16px;font-weight:700;line-height:1.4;padding:12px 0 4px;";
    return `<tr><td style="${totalStyle}">${escapeHtml(label)}</td><td align="right" style="${totalStyle}">${value}</td></tr>`;
  }
  const pad = label === 'Subtotal' ? '12px 0 6px' : '6px 0';
  const rowStyle = `font-family:${FONT_BODY};color:#960000;font-size:14px;font-weight:400;line-height:1.4;padding:${pad};`;
  return `<tr><td style="${rowStyle}">${escapeHtml(label)}</td><td align="right" style="${rowStyle}">${value}</td></tr>`;
}

function renderSubtotals(order) {
  if (order.subtotal == null && order.total == null) return '';
  const rows = [];
  if (order.subtotal != null) rows.push(summaryRow('Subtotal', money(order.subtotal, order.currency)));
  if (order.shipping != null) {
    const label = (order.shippingLabel || 'Shipping').replace(' (Free Shipping)', '');
    const value = Number(order.shipping) === 0 ? 'Free' : money(order.shipping, order.currency);
    rows.push(summaryRow(label, value));
  }
  if (order.tax != null) rows.push(summaryRow((order.taxLabel || 'Taxes').replace('Estimated tax', 'Taxes'), money(order.tax, order.currency)));
  if (order.total != null) rows.push(summaryRow('Total', `${money(order.total, order.currency)} ${order.currency || 'USD'}`, true));
  if (!rows.length) return '';
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #960000;">${rows.join('')}</table>`;
}

function render(order) {
  const itemsHtml = order.lineItems.length
    ? order.lineItems.map((item) => renderLineItem(item, order.currency)).join('')
    : '<p style="color:#888;font-style:italic;font-size:14px;">No line items loaded. Run <code>ruby scripts/fetch-order-preview.rb 87897</code> after setting up .env</p>';

  const customerHtml = (order.shippingAddress || order.billingAddress)
    ? `<table class="customer-columns"><tr>
        ${order.shippingAddress ? `<td class="customer-info__item"><h4>Shipping address</h4><div class="customer-info">${escapeHtml(order.shippingAddress)}</div></td>` : ''}
        ${order.billingAddress ? `<td class="customer-info__item"><h4>Billing address</h4><div class="customer-info">${escapeHtml(order.billingAddress)}</div></td>` : ''}
      </tr></table>`
    : '<p class="customer-info" style="color:#888;">Customer addresses will appear after fetching order data.</p>';

  document.getElementById('preview-label').textContent = `Order confirmation preview — Order #${order.orderNumber}`;
  document.getElementById('preview-note').textContent = order.fetchedAt
    ? `Live Shopify data fetched ${new Date(order.fetchedAt).toLocaleString()}`
    : 'Sample preview — fetch Shopify data to populate';

  document.getElementById('email-root').innerHTML = `
    <table class="body" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>
      <table class="header row on-header" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="header__cell" style="background-color:#960000;padding:28px 40px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="left"><a href="${LINKS.shop}" style="text-decoration:none;"><img src="${LOGO_URL}" alt="Oh Norman!" width="200" height="30" style="display:block;max-width:200px;border:0;"></a></td>
          </tr></table>
        </td>
      </tr></table>
      <table class="row content" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="content__cell" style="background-color:#F3EDE1;padding:48px 40px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr><td>
            <div class="on-content">
              <h2 class="on-heading">Thank you for your order, ${escapeHtml(order.firstName)}!</h2>
              <p class="on-body">Your order is being prepared. We'll send you another email as soon as it's on the way.</p>
              <table class="row actions" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td class="actions__cell">
                <table class="actions-buttons" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td class="button__cell button__cell--primary" width="50%" style="padding:14px 20px;text-align:center;"><a href="#" class="button__text">View your order</a></td>
                  <td class="button__cell--separator">&nbsp;</td>
                  <td class="button__cell button__cell--shop-app" width="50%" style="padding:14px 20px;text-align:center;"><a href="#" class="button__text button__text--shop-app">Track order with Shop</a></td>
                </tr></table>
              </td></tr></table>
              <p class="on-order-number">Order #${escapeHtml(order.orderNumber)}</p>
            </div>
          </td></tr></table>
        </td>
      </tr></table>
      <table class="row section" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="section__cell" style="background-color:#F3EDE1;padding:40px 40px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr><td>
            <h3>Order summary</h3>
            ${itemsHtml}
            ${renderSubtotals(order)}
          </td></tr></table>
        </td>
      </tr></table>
      <table class="row section" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="section__cell" style="background-color:#F3EDE1;padding:40px 40px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr><td>
            <h3>Customer information</h3>
            ${customerHtml}
          </td></tr></table>
        </td>
      </tr></table>
      <table class="row on-help" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="section__cell" style="background-color:#F3EDE1;padding:40px 40px 48px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr><td>
            <h3 class="on-section-headline">Have questions?</h3>
            <p style="font-family:${FONT_BODY};color:#960000;font-size:15px;margin:0;">We're here to help. <a href="${LINKS.contact}">Contact us</a> or check out our <a href="${LINKS.faqs}">FAQs</a>.</p>
          </td></tr></table>
        </td>
      </tr></table>
      <table class="row section on-made-for-pets" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="section__cell" style="background-color:#FFB000;padding:40px 40px 48px;">
          <table class="container" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FFB000;">
            <h3 class="on-section-headline">Made For Pets And The People Who Effing Love Them.</h3>
            <p class="on-made-for-pets-body">All-natural supplements, treats &amp; care products in partnership with Board-Certified Veterinary Specialists. Plus, every purchase <a href="${LINKS.rescue}">gives back to rescues</a>.</p>
          </td></tr></table>
        </td>
      </tr></table>
      <table class="row on-nav" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="background-color:#960000;padding:0;">
          <table class="container" cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
            <tr><td align="center" style="padding:20px 24px;border-bottom:1px solid #F3EDE1;"><a href="${LINKS.dog}" class="on-nav-link">Dog</a></td></tr>
            <tr><td align="center" style="padding:20px 24px;border-bottom:1px solid #F3EDE1;"><a href="${LINKS.cat}" class="on-nav-link">Cat</a></td></tr>
            <tr><td align="center" style="padding:20px 24px;border-bottom:1px solid #F3EDE1;"><a href="${LINKS.gift}" class="on-nav-link">Gift Card</a></td></tr>
          </table>
        </td>
      </tr></table>
      <table class="row footer on-footer" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td class="footer__cell" style="background-color:#960000;padding:28px 20px 0;overflow:hidden;">
          <table class="container" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
            <td align="center" style="padding-bottom:20px;">
              <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
                <td style="padding:0 10px;"><a href="${LINKS.facebook}"><img src="${ICONS.facebook}" alt="Facebook" width="36" height="36" style="display:block;border:0;"></a></td>
                <td style="padding:0 10px;"><a href="${LINKS.tiktok}"><img src="${ICONS.tiktok}" alt="TikTok" width="36" height="36" style="display:block;border:0;"></a></td>
                <td style="padding:0 10px;"><a href="${LINKS.instagram}"><img src="${ICONS.instagram}" alt="Instagram" width="36" height="36" style="display:block;border:0;"></a></td>
              </tr></table>
            </td>
          </tr><tr>
            <td align="center" style="padding-bottom:16px;"><p class="on-footer-text">&copy; ${new Date().getFullYear()} Oh Norman!</p></td>
          </tr><tr>
            <td align="center" style="padding-bottom:24px;">
              <p class="on-footer-text" style="font-size:11px;">
                <a href="${LINKS.contact}">Contact Us</a> &nbsp;|&nbsp;
                <a href="${LINKS.faqs}">FAQs</a> &nbsp;|&nbsp;
                <a href="${LINKS.terms}">Terms of Service</a> &nbsp;|&nbsp;
                <a href="${LINKS.privacy}">Privacy Policy</a>
              </p>
            </td>
          </tr></table>
          <table class="container on-mascot-wrap" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td class="on-mascot-cell" align="right" valign="bottom" style="padding:0;"><img src="${MASCOT_URL}" alt="" width="260" style="display:block;width:260px;max-width:260px;height:auto;border:0;margin:0 0 -72px 0;"></td>
          </tr></table>
        </td>
      </tr></table>
    </td></tr></table>`;

  if (location.search.includes('screenshot=1')) {
    document.getElementById('preview-label').style.display = 'none';
    document.getElementById('preview-note').style.display = 'none';
    document.body.style.background = '#ffffff';
    document.body.style.padding = '0';
  }
}

Promise.all([
  fetch('preview-assets.json?' + Date.now()).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
  fetch('order-preview-data.json?' + Date.now()).then((r) => { if (!r.ok) throw new Error('missing'); return r.json(); })
]).then(([assets, order]) => {
  if (assets.on_facebook_icon_url) ICONS.facebook = assets.on_facebook_icon_url;
  if (assets.on_instagram_icon_url) ICONS.instagram = assets.on_instagram_icon_url;
  if (assets.on_tiktok_icon_url) ICONS.tiktok = assets.on_tiktok_icon_url;
  if (assets.on_mascot_peek_url) MASCOT_URL = assets.on_mascot_peek_url;
  render(order);
}).catch(() => {
  document.getElementById('preview-note').className = 'preview-note error';
  document.getElementById('preview-note').innerHTML = 'No Shopify data yet. Follow <strong>PREVIEW-SETUP.md</strong>, then run <code>ruby scripts/fetch-order-preview.rb 87897</code>.';
  render(FALLBACK);
});
