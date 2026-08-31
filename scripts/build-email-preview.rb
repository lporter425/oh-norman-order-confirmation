#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'

ROOT = File.expand_path('..', __dir__)
liquid = File.read(File.join(ROOT, 'oh-norman-order-confirmation.liquid'), encoding: 'UTF-8')
css = liquid[/  <style>\n(.*?)  <\/style>/m, 1]
fonts = {
  '{{ on_font_body }}' => '"SharpSans-Book", "Open Sans", Arial, sans-serif',
  '{{ on_font_headline }}' => '"SharpGroteskBold", "Open Sans", Arial, sans-serif',
  '{{ on_font_subhead }}' => '"SharpGroteskMedium", "Open Sans", Arial, sans-serif'
}
fonts.each { |k, v| css = css.gsub(k, v) }

extra_css = <<~CSS
  body { margin: 0; padding: 32px 16px; background: #e8e8e8; font-family: "SharpSans-Book", "Open Sans", Arial, sans-serif !important; line-height: 1.4 !important; }
  .preview-label { max-width: 600px; margin: 0 auto 8px; font-size: 13px; color: #666; text-align: center; }
  .preview-note { max-width: 600px; margin: 0 auto 16px; font-size: 12px; color: #888; text-align: center; line-height: 1.4; }
  .preview-note.error { color: #960000; }
  .email-wrapper { max-width: 600px; margin: 0 auto; background: #F3EDE1; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .on-line-item { margin: 0 0 16px !important; }
  .on-line-item:last-of-type { margin-bottom: 0 !important; }
  .customer-info { font-family: "SharpSans-Book", "Open Sans", Arial, sans-serif !important; font-size: 14px; color: #960000 !important; line-height: 1.4 !important; white-space: pre-line; text-align: left !important; }
  .customer-columns { width: 100%; border-collapse: collapse; }
  .customer-columns td { vertical-align: top; width: 50%; padding-right: 12px; text-align: left !important; }
CSS

icons = {}
liquid.each_line do |line|
  next unless line =~ /\{% assign (on_(?:facebook|tiktok|instagram)_icon_url|on_mascot_peek_url) = '(.*)' %\}/
  icons[Regexp.last_match(1)] = Regexp.last_match(2)
end
File.write(File.join(ROOT, 'preview-assets.json'), JSON.pretty_generate(icons))

js = File.read(File.join(ROOT, 'scripts', 'email-preview.template.js'), encoding: 'UTF-8')
html = <<~HTML
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Oh Norman — Order Confirmation Preview</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap">
    <style>
  #{css}#{extra_css}
    </style>
  </head>
  <body>
    <p class="preview-label" id="preview-label">Oh Norman order confirmation preview</p>
    <p class="preview-note" id="preview-note">Loading Shopify order data…</p>
    <div class="email-wrapper" id="email-root"></div>
    <script>
  #{js}
    </script>
  </body>
  </html>
HTML

File.write(File.join(ROOT, 'email-preview.html'), html, encoding: 'UTF-8')
puts "Built email-preview.html and preview-assets.json"
