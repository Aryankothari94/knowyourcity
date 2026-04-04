import sys

content = open('dining.html', 'r', encoding='utf8').read()
content = content.replace('\\$', '$').replace('\\`', '`')
open('dining.html', 'w', encoding='utf8').write(content)
print("Done patching.")
