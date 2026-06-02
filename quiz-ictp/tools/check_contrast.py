#!/usr/bin/env python3
"""Simple WCAG contrast checker for quiz-ictp styles.

Usage: run from repository root or set working directory to quiz-ictp/.
It parses CSS variables from the embedded <style> in `index.html` and
checks contrast ratios for a small set of UI selectors in dark and light themes.
"""
import re
import os
from math import pow

HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'index.html')


def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join([c*2 for c in h])
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def srgb_to_linear(c):
    c = c / 255.0
    if c <= 0.03928:
        return c / 12.92
    return pow((c + 0.055) / 1.055, 2.4)


def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)


def contrast_ratio(c1, c2):
    l1 = luminance(hex_to_rgb(c1))
    l2 = luminance(hex_to_rgb(c2))
    L1, L2 = max(l1, l2), min(l1, l2)
    return (L1 + 0.05) / (L2 + 0.05)


def extract_style(html):
    m = re.search(r"<style>([\s\S]*?)</style>", html, re.IGNORECASE)
    return m.group(1) if m else ''


def parse_vars(style_text):
    # Parse :root variables and light-mode overrides
    root_pattern = re.compile(r":root\s*{([\s\S]*?)}")
    media_light_pattern = re.compile(r"@media\s*\(prefers-color-scheme:\s*light\)\s*{([\s\S]*?)}", re.IGNORECASE)

    def vars_in(block):
        d = {}
        for m in re.finditer(r"--([a-zA-Z0-9\-]+)\s*:\s*([^;]+);", block):
            name = m.group(1).strip()
            val = m.group(2).strip()
            d[name] = val
        return d

    vars_default = {}
    # find first :root
    mroot = re.search(r":root\s*{([\s\S]*?)}}", style_text)
    if mroot:
        vars_default.update(vars_in(mroot.group(1)))
    else:
        # fallback generic parse
        vars_default.update(vars_in(style_text))

    # light overrides
    mlight = media_light_pattern.search(style_text)
    vars_light = {}
    if mlight:
        # extract :root inside media
        mroot_light = re.search(r":root\s*{([\s\S]*?)}", mlight.group(1))
        if mroot_light:
            vars_light.update(vars_in(mroot_light.group(1)))

    return vars_default, vars_light


def resolve_var(val, vars_map):
    val = val.strip()
    m = re.match(r"var\(--([a-zA-Z0-9\-]+)\)", val)
    if m:
        key = m.group(1)
        return vars_map.get(key)
    return val


def normalize_color(val):
    # only hex colors supported in this simple checker
    val = val.strip()
    if val.startswith('#'):
        return val
    # try to strip rgb(...) formats
    m = re.match(r"rgb\((\d+),\s*(\d+),\s*(\d+)\)", val)
    if m:
        return '#%02x%02x%02x' % (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    # unknown -> return black
    return '#000000'


def main():
    with open(HTML_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    style = extract_style(html)
    vars_default, vars_light = parse_vars(style)

    # build theme maps
    dark = vars_default.copy()
    light = vars_default.copy()
    light.update(vars_light)

    themes = {'dark': dark, 'light': light}

    # selectors to check: mapping -> (bg_expr, fg_expr)
    checks = {
        '.feedback.correct': ('var(--color-green)', 'var(--text-primary) /* overridden to white in CSS */'),
        '.feedback.wrong': ('var(--color-red)', 'var(--text-primary) /* overridden to white in CSS */'),
        '.option-btn': ('var(--color-blue)', 'var(--text-primary)'),
        '.option-btn:hover': ('var(--color-blue)', '#ffffff'),
        '.option-btn.correct': ('var(--color-green)', '#ffffff'),
        '.option-btn.wrong': ('var(--color-red)', '#ffffff'),
        'header-text': ('var(--bg-primary)', 'var(--text-primary)'),
    }

    print('Contrast results (ratio >= 4.5 passes):')
    for theme_name, vars_map in themes.items():
        print('\nTheme:', theme_name)
        # resolve combined variable map where var() can be used
        resolved = {}
        for k, v in vars_map.items():
            resolved[k] = v.strip()

        for sel, (bg_expr, fg_expr) in checks.items():
            bg = resolve_var(bg_expr, resolved) or bg_expr
            fg = resolve_var(fg_expr, resolved) or fg_expr
            bg = normalize_color(bg)
            fg = normalize_color(fg)
            try:
                ratio = contrast_ratio(bg, fg)
            except Exception:
                ratio = 0
            status = 'PASS' if ratio >= 4.5 else 'FAIL'
            print(f"  {sel:25s}: fg={fg:9s} bg={bg:9s}  ratio={ratio:.2f} {status}")


if __name__ == '__main__':
    main()
