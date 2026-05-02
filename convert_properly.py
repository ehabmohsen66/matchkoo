import re
import json

def kebab_to_camel(kebab):
    parts = kebab.split('-')
    return parts[0] + ''.join(x.capitalize() for x in parts[1:])

def style_to_jsx(match):
    style_str = match.group(1)
    if not style_str.strip():
        return ""
    
    style_obj = {}
    declarations = style_str.split(';')
    for decl in declarations:
        if ':' in decl:
            key, val = decl.split(':', 1)
            key = key.strip()
            val = val.strip()
            camel_key = kebab_to_camel(key)
            style_obj[camel_key] = val
            
    # Serialize to JSX string
    items = []
    for k, v in style_obj.items():
        # Handle cases like url(...) correctly, but simple JSON dump is usually fine
        items.append(f'"{k}": "{v}"')
        
    return "style={{" + ", ".join(items) + "}}"

with open("legacy_html/landing.html", "r") as f:
    html = f.read()

# Extract body
body_match = re.search(r'<body>(.*?)</body>', html, re.DOTALL)
content = body_match.group(1) if body_match else ""

# Remove scripts
content = re.sub(r'<script.*?>.*?</script>', '', content, flags=re.DOTALL)

# Replace comments
content = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', content, flags=re.DOTALL)

# Replace class
content = content.replace('class="', 'className="')

# Fix self-closing
content = re.sub(r'<img([^>]*?)(?<!/)>', r'<img\1 />', content)
content = re.sub(r'<input([^>]*?)(?<!/)>', r'<input\1 />', content)
content = re.sub(r'<br([^>]*?)(?<!/)>', r'<br />', content)
content = re.sub(r'<hr([^>]*?)(?<!/)>', r'<hr />', content)

# SVG props
svg_props = ["stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "clip-rule"]
for prop in svg_props:
    camel_prop = kebab_to_camel(prop)
    content = content.replace(f'{prop}="', f'{camel_prop}="')

# Fix styles
content = re.sub(r'style="([^"]*?)"', style_to_jsx, content)

# Remove problematic namespaces
content = content.replace('xmlns:xlink="http://www.w3.org/1999/xlink"', '')
content = content.replace('xml:space="preserve"', '')
content = content.replace('onmouseover="this.style.color=\'#fff\';this.style.borderColor=\'rgba(255,255,255,0.28)\'"', '')
content = content.replace('onmouseout="this.style.color=\'rgba(255,255,255,0.5)\';this.style.borderColor=\'rgba(255,255,255,0.1)\'"', '')
content = content.replace('onclick="toggleFaq(this)"', '')

page_tsx = f"""import './landing.css';
import Link from 'next/link';

export default function Home() {{
  return (
    <div className="landing-page-container bg-[var(--ink)] text-[var(--white)] font-['Inter']">
      {content}
    </div>
  );
}}
"""

with open("src/app/page.tsx", "w") as f:
    f.write(page_tsx)
