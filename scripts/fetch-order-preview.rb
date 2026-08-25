#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'net/http'
require 'uri'

ROOT = File.expand_path('..', __dir__)
ENV_PATH = File.join(ROOT, '.env')
OUT_PATH = File.join(ROOT, 'order-preview-data.json')

def load_env(path)
  return unless File.exist?(path)

  File.read(path).each_line do |line|
    line = line.strip
    next if line.empty? || line.start_with?('#')

    key, value = line.split('=', 2)
    ENV[key] = value.to_s.strip.gsub(/\A["']|["']\z/, '')
  end
end

def shop_host(store)
  store = store.to_s.strip
  return nil if store.empty?

  store.include?('.') ? store : "#{store}.myshopify.com"
end

def fetch_access_token(store_host)
  static = ENV['SHOPIFY_ADMIN_TOKEN']
  return static if static && !static.empty? && !static.include?('xxxx')

  client_id = ENV['SHOPIFY_CLIENT_ID']
  client_secret = ENV['SHOPIFY_CLIENT_SECRET']
  if client_id.to_s.empty? || client_secret.to_s.empty?
    warn <<~MSG
      Missing Shopify credentials in .env

      Option A — Legacy admin custom app (shpat_ token):
        SHOPIFY_STORE=oh-norman.myshopify.com
        SHOPIFY_ADMIN_TOKEN=shpat_...

      Option B — Dev Dashboard app (2026+ flow):
        SHOPIFY_STORE=oh-norman.myshopify.com
        SHOPIFY_CLIENT_ID=your_client_id
        SHOPIFY_CLIENT_SECRET=your_client_secret

      See PREVIEW-SETUP.md for setup steps.
    MSG
    exit 1
  end

  uri = URI("https://#{store_host}/admin/oauth/access_token")
  req = Net::HTTP::Post.new(uri)
  req['Content-Type'] = 'application/x-www-form-urlencoded'
  req.body = URI.encode_www_form(
    grant_type: 'client_credentials',
    client_id: client_id,
    client_secret: client_secret
  )

  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
  body = JSON.parse(res.body)

  unless res.is_a?(Net::HTTPSuccess) && body['access_token']
    warn "Token request failed (#{res.code}):\n#{JSON.pretty_generate(body)}"
    exit 1
  end

  body['access_token']
end

load_env(ENV_PATH)

store_host = shop_host(ENV['SHOPIFY_STORE'])
order_name = (ARGV[0] || '87897').delete_prefix('#')

if store_host.to_s.empty?
  warn 'Set SHOPIFY_STORE in .env (e.g. oh-norman.myshopify.com)'
  exit 1
end

token = fetch_access_token(store_host)

query = <<~GRAPHQL
  {
    orders(first: 1, query: "name:#{order_name}") {
      edges {
        node {
          name
          email
          currencyCode
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalShippingPriceSet { shopMoney { amount currencyCode } }
          totalTaxSet { shopMoney { amount currencyCode } }
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { firstName lastName }
          shippingAddress {
            name
            address1
            address2
            city
            provinceCode
            zip
            country
          }
          billingAddress {
            name
            address1
            address2
            city
            provinceCode
            zip
            country
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                variantTitle
                quantity
                originalUnitPriceSet { shopMoney { amount currencyCode } }
                discountedTotalSet { shopMoney { amount currencyCode } }
                image { url }
              }
            }
          }
        }
      }
    }
  }
GRAPHQL

uri = URI("https://#{store_host}/admin/api/2025-01/graphql.json")
req = Net::HTTP::Post.new(uri)
req['Content-Type'] = 'application/json'
req['X-Shopify-Access-Token'] = token
req.body = JSON.generate(query: query)

res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
body = JSON.parse(res.body)

if body['errors']
  warn "Shopify API error:\n#{JSON.pretty_generate(body['errors'])}"
  exit 1
end

order = body.dig('data', 'orders', 'edges', 0, 'node')
unless order
  warn "Order ##{order_name} not found."
  exit 1
end

def format_address(addr)
  return nil unless addr

  lines = [
    addr['name'],
    addr['address1'],
    addr['address2'],
    [addr['city'], addr['provinceCode'], addr['zip']].compact.join(', '),
    addr['country']
  ].compact.reject(&:empty?)
  lines.join("\n")
end

payload = {
  fetchedAt: Time.now.utc.iso8601,
  orderNumber: order['name'].delete_prefix('#'),
  firstName: order.dig('customer', 'firstName') || order.dig('shippingAddress', 'name')&.split&.first || 'there',
  email: order['email'],
  currency: order['currencyCode'],
  lineItems: order.dig('lineItems', 'edges').to_a.map do |edge|
    item = edge['node']
    {
      title: item['title'],
      variant: item['variantTitle'],
      quantity: item['quantity'],
      unitPrice: item.dig('originalUnitPriceSet', 'shopMoney', 'amount'),
      lineTotal: item.dig('discountedTotalSet', 'shopMoney', 'amount'),
      image: item.dig('image', 'url')
    }
  end,
  subtotal: order.dig('subtotalPriceSet', 'shopMoney', 'amount'),
  shipping: order.dig('totalShippingPriceSet', 'shopMoney', 'amount'),
  tax: order.dig('totalTaxSet', 'shopMoney', 'amount'),
  total: order.dig('totalPriceSet', 'shopMoney', 'amount'),
  shippingAddress: format_address(order['shippingAddress']),
  billingAddress: format_address(order['billingAddress'])
}

File.write(OUT_PATH, JSON.pretty_generate(payload))
puts "Wrote #{OUT_PATH} for order #{order['name']} (#{payload[:lineItems].size} items)"
