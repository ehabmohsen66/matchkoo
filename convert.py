import re

with open("legacy_html/landing.html", "r") as f:
    html = f.read()

# Extract styles
style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
styles = style_match.group(1) if style_match else ""

with open("src/app/landing.css", "w") as f:
    f.write(styles)

# Extract body
body_match = re.search(r'<body>(.*?)</body>', html, re.DOTALL)
body_content = body_match.group(1) if body_match else ""

# Replace class= with className=
body_content = body_content.replace('class="', 'className="')

# Replace inline styles and SVG attributes
body_content = body_content.replace('stroke-width="', 'strokeWidth="')
body_content = body_content.replace('stroke-linecap="', 'strokeLinecap="')
body_content = body_content.replace('stroke-linejoin="', 'strokeLinejoin="')
body_content = body_content.replace('fill-rule="', 'fillRule="')
body_content = body_content.replace('clip-rule="', 'clipRule="')

# Close unclosed tags
body_content = re.sub(r'<img([^>]*?)(?<!/)>', r'<img\1 />', body_content)
body_content = re.sub(r'<input([^>]*?)(?<!/)>', r'<input\1 />', body_content)
body_content = re.sub(r'<br([^>]*?)(?<!/)>', r'<br />', body_content)

# We need to replace inline style="color: #ABFF4F" to style={{ color: '#ABFF4F' }}
# There's a known style in landing: style="color: #ABFF4F"
body_content = re.sub(r'style="([^"]*?)"', r'style={{\1}}', body_content) # Note this is simplified and might not cover all cases perfectly

# Generate page.tsx
page_tsx = f"""import './landing.css';
import Link from 'next/link';

export default function Home() {{
  return (
    <div className="landing-page-container bg-[var(--ink)] text-[var(--white)] font-['Inter']">
      {body_content}
    </div>
  );
}}
"""

with open("src/app/page.tsx", "w") as f:
    f.write(page_tsx)
