#!/usr/bin/env python3
"""Offline gate for shopify/ when the Shopify CLI / `shopify theme check` is not
available (no network in CI sandboxes). It is not a replacement for Theme Check —
it catches the mistakes that break an upload or a page render:

  * unbalanced {{ }} / {% %} and unclosed block tags
  * unknown filters (typos like `| default:` on `| t`)
  * `render` / `section` targets that do not exist
  * invalid JSON in {% schema %} and in templates/*.json
  * template section types that have no section file
  * section or template settings that are not declared in its own schema
  * global settings.* that are not in config/settings_schema.json
  * rough tag-balance check on block elements

Usage: python3 scripts/check-shopify-theme.py
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shopify')

FILTERS = set('''abs append at_least at_most capitalize ceil compact concat date default divided_by
downcase escape escape_once first floor handle handleize h join last lstrip map minus modulo
newline_to_br plus prepend remove remove_first replace replace_first reverse round rstrip size slice
sort sort_natural split strip strip_html strip_newlines times truncate truncatewords truncatewords_html
uniq upcase url_encode url_escape url_param_escape where where_exp sum json image_url img_url money
money_with_currency money_without_currency money_without_trailing_zeros t time_tag link_to asset_url
stylesheet_tag script_tag font_url font_face font_modify color_to_rgb color_to_hsl color_lighten
color_darken color_saturate color_desaturate color_modify color_extract color_contrast color_brightness
color_mix brightness_to_rgb hex_to_rgb rgba_to_hex default_errors default_pagination pluralize
weight_with_unit format_address highlight highlight_active_tag inline_asset_content preload_tag image_tag
video_tag media_tag metafield_tag metafield_text external_video_tag model_viewer_tag placeholder_svg_tag
payment_type_svg_tag customer_login_link customer_logout_link customer_register_link avatar link_to_vendor
link_to_type link_to_add_tag link_to_remove_tag link_to_tag within article_img_url structured_data
class_list camelize plural_handle format_code'''.split())

TAGS = set('''if else elsif unless for case when endif endfor endunless endcase assign capture endcapture
include render section layout echo liquid tablerow endtablerow comment endcomment raw endraw schema
endschema javascript endjavascript form endform paginate endpaginate break continue cycle increment
decrement style endstyle stylesheet section_region endsection_region'''.split())

problems = []


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def declared_ids(schema):
    ids = set()

    def walk(items):
        for item in items or []:
            if 'id' in item:
                ids.add(item['id'])
            walk(item.get('settings'))
            for block in item.get('blocks') or []:
                walk(block.get('settings'))

    walk(schema.get('settings'))
    for block in schema.get('blocks') or []:
        walk(block.get('settings'))
    return ids


liquid_files = []
for base, _dirs, names in os.walk(ROOT):
    for name in names:
        if name.endswith('.liquid'):
            liquid_files.append(os.path.join(base, name))

for path in liquid_files:
    rel = os.path.relpath(path, ROOT)
    src = read(path)
    if src.count('{%') != src.count('%}') or src.count('{{') != src.count('}}'):
        problems.append(f'{rel}: unbalanced {{% %}} or {{{{ }}}}')

    # block tags open/close
    for opener, closer in [('if', 'endif'), ('unless', 'endunless'), ('for', 'endfor'),
                           ('case', 'endcase'), ('capture', 'endcapture'),
                           ('form', 'endform'), ('paginate', 'endpaginate'),
                           ('schema', 'endschema'), ('comment', 'endcomment'),
                           ('raw', 'endraw'), ('javascript', 'endjavascript')]:
        opened = len(re.findall(r'{%-?\s*' + opener + r'\b', src))
        closed = len(re.findall(r'{%-?\s*' + closer + r'\b', src))
        if opened != closed:
            problems.append(f'{rel}: {opener}={opened} but {closer}={closed}')

    schema_match = re.search(r'{%\s*schema\s*%}(.*?){%\s*endschema\s*%}', src, re.S)
    schema = {}
    if schema_match:
        try:
            schema = json.loads(schema_match.group(1))
        except json.JSONDecodeError as exc:
            problems.append(f'{rel}: schema JSON invalid: {exc}')
    own_ids = declared_ids(schema)

    # filters, ignoring {% render %} argument lists and comments
    body = re.sub(r'{%-?\s*comment.*?{%-?\s*endcomment\s*%}', '', src, flags=re.S)
    body = re.sub(r'{%-?\s*schema\s*%}.*?{%-?\s*endschema\s*%}', '', body, flags=re.S)
    for match in re.finditer(r'(\{\{.*?\}\}|{%-?\s*[a-zA-Z_]+(.*?)%})', body, re.S):
        chunk = match.group(0)
        for filt in re.finditer(r'\|\s*([a-zA-Z_][a-zA-Z0-9_]*)', chunk):
            name = filt.group(1)
            if name not in FILTERS and name not in TAGS:
                problems.append(f'{rel}: unknown filter "{name}"')

    for match in re.finditer(r"render\s+'([^']+)'", src):
        if not os.path.exists(os.path.join(ROOT, 'snippets', match.group(1) + '.liquid')):
            problems.append(f'{rel}: render target missing snippets/{match.group(1)}.liquid')

    for match in re.finditer(r"section\s+'([^']+)'", src):
        if not os.path.exists(os.path.join(ROOT, 'sections', match.group(1) + '.liquid')):
            problems.append(f'{rel}: section target missing sections/{match.group(1)}.liquid')

    # section/template level settings must be declared in this file's schema
    for match in re.finditer(r'section\.settings\.([a-zA-Z0-9_]+)', src):
        if match.group(1) not in own_ids:
            problems.append(f'{rel}: section.settings.{match.group(1)} not declared')

    for tag in ('div', 'section', 'ul', 'svg', 'details', 'form'):
        opened = len(re.findall(r'<' + tag + r'[\s>]', src))
        closed = len(re.findall(r'</' + tag + r'>', src))
        if opened != closed:
            problems.append(f'{rel}: <{tag}> open {opened} / close {closed}')

# templates
templates_dir = os.path.join(ROOT, 'templates')
for name in sorted(os.listdir(templates_dir)):
    if not name.endswith('.json'):
        continue
    rel = os.path.join('templates', name)
    try:
        data = json.load(open(os.path.join(templates_dir, name), encoding='utf-8'))
    except json.JSONDecodeError as exc:
        problems.append(f'{rel}: invalid JSON: {exc}')
        continue
    for key, section in data.get('sections', {}).items():
        if not os.path.exists(os.path.join(ROOT, 'sections', section['type'] + '.liquid')):
            problems.append(f'{rel}: section "{key}" type missing sections/{section["type"]}.liquid')

# global settings referenced by any file
global_schema = json.load(open(os.path.join(ROOT, 'config', 'settings_schema.json'), encoding='utf-8'))
global_ids = set()
for group in global_schema:
    global_ids |= declared_ids(group)

for path in liquid_files:
    rel = os.path.relpath(path, ROOT)
    src = re.sub(r'{%-?\s*schema\s*%}.*?{%-?\s*endschema\s*%}', '', read(path), flags=re.S)
    for match in re.finditer(r'(?<!\.)\bsettings\.([a-zA-Z0-9_]+)', src):
        if match.group(1) not in global_ids:
            problems.append(f'{rel}: settings.{match.group(1)} not in config/settings_schema.json')

if problems:
    for problem in sorted(set(problems)):
        print('FAIL', problem)
    print(f'\n{len(set(problems))} problem(s) in {len(liquid_files)} liquid files')
    sys.exit(1)

print(f'OK — {len(liquid_files)} liquid files, '
      f'{len([n for n in os.listdir(templates_dir) if n.endswith(".json")])} JSON templates, 0 problems')
