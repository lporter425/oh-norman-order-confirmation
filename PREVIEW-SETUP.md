# Preview Oh Norman emails in Cursor with live Shopify order data

Use this to preview your **local** `oh-norman-order-confirmation.liquid` design with real order data — before pasting anything into Shopify Notifications.

## Quick fix: "cursor-email-preview.com's server IP address could not be found"

This happens when your app’s **App URL** points to a domain that doesn’t exist. Shopify auto-guesses a URL from the app name — you don’t need a real website for this preview.

**Fix it in the Dev Dashboard:**

1. Open [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) → your app
2. Go to **Versions** (or **Configuration**)
3. Set **App URL** to: `https://shopify.dev/apps/default-app-home`
4. Set **Allowed redirection URL(s)** to the same URL (if the field is required)
5. **Save** and **Release** a new version
6. Reinstall the app on the Oh Norman store

That placeholder URL is Shopify’s official default for apps with no UI — install will succeed without loading a broken domain.

---

## Choose your setup path

Shopify has two ways to get API access. Pick whichever your store offers.

### Path A — Legacy admin custom app (simplest if available)

Best when you see **Develop apps** directly in Shopify Admin and get a copyable `shpat_` token.

1. Open [Shopify Admin → Develop apps](https://admin.shopify.com/store/oh-norman/settings/apps/development)
2. If you see **Allow custom app development**, enable it
3. **Create an app** → name it `Cursor Email Preview`
4. **Configure Admin API scopes** → enable **`read_orders`** only
5. **Save** → **Install app** → **Install**
6. **Reveal token once** → copy the `shpat_...` token

`.env`:

```
SHOPIFY_STORE=oh-norman.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_your_token_here
```

### Path B — Dev Dashboard app (2026+ flow)

Use this if admin sends you to **Build apps in Dev Dashboard** or you only see Client ID / Client Secret.

1. Open [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) → **Create app**
2. Name it `Cursor Email Preview`
3. Create a **version** with:
   - **App URL:** `https://shopify.dev/apps/default-app-home`
   - **Admin API scopes:** `read_orders` only
4. **Release** the version
5. **Install** on `oh-norman` store (Custom distribution → select your store)
6. In app **Settings**, copy **Client ID** and **Client secret**

`.env`:

```
SHOPIFY_STORE=oh-norman.myshopify.com
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
```

The fetch script exchanges these for a short-lived access token automatically.

---

## Fetch order data

```bash
ruby scripts/fetch-order-preview.rb 87897
```

This writes `order-preview-data.json` with customer name, line items, totals, and addresses.

## Sync preview with Liquid changes

After editing `oh-norman-order-confirmation.liquid`, rebuild the browser preview so CSS and assets stay in sync:

```bash
ruby scripts/build-email-preview.rb
```

## Open the preview

```bash
ruby -run -e httpd . -p 8765
```

Visit: **http://localhost:8765/email-preview.html**

## Daily workflow

```bash
ruby scripts/fetch-order-preview.rb 87897   # any order number
# refresh http://localhost:8765/email-preview.html
```

When the design looks good, copy `oh-norman-order-confirmation.liquid` into Shopify Notifications.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `cursor-email-preview.com … could not be found` | Set App URL to `https://shopify.dev/apps/default-app-home` and reinstall |
| `Invalid API key or access token` | Use `shpat_` (Path A), not `shpss_` session tokens |
| `shop_not_permitted` | App and store must be in the same Dev Dashboard organization |
| Order not found | Confirm order number exists; try `#87897` or `87897` |
