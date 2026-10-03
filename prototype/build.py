#!/usr/bin/env python3
"""Bundle the prototype.

  python3 build.py                 dist/habit-sync.html (full page) + habit-sync.fragment.html (no html/head/body wrapper, for sandboxed hosts)
  python3 build.py --pages DIR     a static PWA site (index, manifest, service worker, icons) for GitHub Pages
  python3 build.py --native DIR    index.html + privacypolicy.html for the Android shell (www folder)
"""
import hashlib, os, re, shutil, sys
root = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(root, p), encoding='utf-8').read()

def bundle(for_fragment=False):
    html = read('index.html')
    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
    html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + read(m.group(1)) + '\n</script>', html)
    if for_fragment:
        html = '\n'.join(l for l in html.split('\n') if 'rel="manifest"' not in l and 'rel="apple-touch-icon"' not in l and 'rel="icon"' not in l)
    return html

def fragment(html):
    drop = [r'^<!doctype html>$', r'^<html lang="en">$', r'^<head>$', r'^</head>$', r'^<body>$', r'^</body>$', r'^</html>$',
            r'^<meta charset', r'^<meta name="viewport"', r'^<meta name="theme-color"']
    return '\n'.join(l for l in html.split('\n') if not any(re.match(d, l) for d in drop))

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

args = sys.argv[1:]
if args[:1] == ['--pages']:
    out = args[1]
    html = bundle()
    build_id = hashlib.sha1(html.encode()).hexdigest()[:10]
    write(os.path.join(out, 'index.html'), html)
    write(os.path.join(out, 'sw.js'), read('sw.js').replace('__BUILD__', build_id))
    shutil.copy(os.path.join(root, 'manifest.webmanifest'), os.path.join(out, 'manifest.webmanifest'))
    shutil.copy(os.path.join(root, 'privacypolicy.html'), os.path.join(out, 'privacypolicy.html'))
    shutil.copytree(os.path.join(root, 'icons'), os.path.join(out, 'icons'), dirs_exist_ok=True)
    write(os.path.join(out, '.nojekyll'), '')
    print('pages site', out, build_id, len(html), 'bytes')
elif args[:1] == ['--native']:
    out = args[1]
    write(os.path.join(out, 'index.html'), bundle())
    shutil.copy(os.path.join(root, 'privacypolicy.html'), os.path.join(out, 'privacypolicy.html'))
    print('native www', out)
else:
    out = os.path.join(root, 'dist')
    full, frag = bundle(), fragment(bundle(True))
    write(os.path.join(out, 'habit-sync.html'), full)
    write(os.path.join(out, 'habit-sync.fragment.html'), frag)
    print('built', out, len(full), 'bytes')
