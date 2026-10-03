#!/usr/bin/env python3
"""Bundle the prototype into one self-contained HTML file.
Usage: python3 build.py [out_dir]
Writes habit-sync.html (a full page) and habit-sync.fragment.html (no doctype/html/head/body wrapper, for hosts that add their own)."""
import os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'dist')
os.makedirs(out, exist_ok=True)
html = open(os.path.join(root, 'index.html')).read()
read = lambda p: open(os.path.join(root, p)).read()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + read(m.group(1)) + '\n</script>', html)
open(os.path.join(out, 'habit-sync.html'), 'w').write(html)
drop = [r'^<!doctype html>$', r'^<html lang="en">$', r'^<head>$', r'^</head>$', r'^<body>$', r'^</body>$', r'^</html>$',
        r'^<meta charset', r'^<meta name="viewport"', r'^<meta name="theme-color"']
frag = '\n'.join(l for l in html.split('\n') if not any(re.match(d, l) for d in drop))
open(os.path.join(out, 'habit-sync.fragment.html'), 'w').write(frag)
print('built', out, len(html), 'bytes')
