import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

# Replace HTML comments
content = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', content, flags=re.DOTALL)

# Fix inline styles (convert style="color: #ABFF4F" to style={{ color: '#ABFF4F' }})
# Our previous replace was style={{color: #ABFF4F}}, let's fix it by regex
# We will just replace all style={{...}} back to style="..." then do it correctly if needed, or just remove inline styles and use classes
content = re.sub(r'style=\{\{([^:}]+):\s*([^}]+)\}\}', lambda m: f'style={{{{ {m.group(1)}: "{m.group(2).strip()}" }}}}', content)

# A common issue in SVGs: XML namespaces
content = content.replace('xmlns:xlink="http://www.w3.org/1999/xlink"', '')
content = content.replace('xml:space="preserve"', '')

with open("src/app/page.tsx", "w") as f:
    f.write(content)
