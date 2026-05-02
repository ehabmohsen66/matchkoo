import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

# Replace links correctly
content = content.replace('href="/app" className="btn-ghost">Sign In', 'href="/login" className="btn-ghost">Sign In')
content = content.replace('href="/app" className="btn-primary">', 'href="/register" className="btn-primary">')
content = content.replace('href="/app" className="btn-primary btn-primary-lg">', 'href="/register" className="btn-primary btn-primary-lg">')
content = content.replace('href="/app"', 'href="/dashboard"')

with open("src/app/page.tsx", "w") as f:
    f.write(content)
