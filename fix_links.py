import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

# Fix links
content = content.replace('href="app.html"', 'href="/login"')
content = content.replace('href="landing-ar.html"', 'href="#"')
content = content.replace('href="#login"', 'href="/login"')
content = content.replace('href="#register"', 'href="/register"')
content = content.replace('href="login.html"', 'href="/login"')
content = content.replace('href="register.html"', 'href="/register"')

# The original HTML had buttons like <button class="btn-primary" onclick="window.location.href='app.html'">
content = content.replace('onclick="window.location.href=\'app.html\'"', 'onClick={() => window.location.href=\'/register\'}')

with open("src/app/page.tsx", "w") as f:
    f.write(content)
