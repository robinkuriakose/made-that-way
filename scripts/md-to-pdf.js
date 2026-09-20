// Turns a Markdown document into a PDF that looks like the rest of the
// project: same colours, same restraint, Poppins where it's available.
//
//   npm run pdf -- docs/ux-research.md
//   npm run pdf -- docs/ux-research.md docs/out.pdf
//   npm run pdf -- docs/ux-research.md --keep-html   (keeps the HTML, for checking)
//
// It writes an HTML file next to the PDF and prints it with headless Edge
// (or Chrome), which is already on this machine, so there's nothing to
// install. No Markdown library either: this handles the pieces we actually
// write (headings, paragraphs, lists, tables, rules, bold, italic, code,
// links) and nothing else.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Bold, italic, inline code and links, in that order.
function inline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

function toHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      closeList();
      out.push('<hr />');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    // A table: a header row, a divider, then rows.
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      closeList();
      const head = cells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      i -= 1;
      out.push('<table><thead><tr>');
      for (const c of head) out.push(`<th>${inline(c)}</th>`);
      out.push('</tr></thead><tbody>');
      for (const row of rows) {
        out.push('<tr>');
        for (const c of row) out.push(`<td>${inline(c)}</td>`);
        out.push('</tr>');
      }
      out.push('</tbody></table>');
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (list !== wanted) {
        closeList();
        out.push(`<${wanted}>`);
        list = wanted;
      }
      out.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
  :root { --ink: #16150f; --ink-2: #3f3e37; --muted: #77756c; --line: #e5e3db; --accent-ink: #4b5a0c; --accent-soft: #f2f9d3; }
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink); font-size: 10.5pt; line-height: 1.6;
    font-family: Poppins, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 24pt; font-weight: 500; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6pt; }
  h2 { font-size: 15pt; font-weight: 500; margin: 22pt 0 6pt; padding-top: 8pt; border-top: 1px solid var(--line); break-after: avoid; }
  h3 { font-size: 11.5pt; font-weight: 500; margin: 14pt 0 4pt; break-after: avoid; }
  h1 + p { color: var(--muted); }
  p { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 10pt; padding-left: 16pt; }
  li { margin-bottom: 4pt; }
  li::marker { color: var(--muted); }
  strong { font-weight: 500; }
  code { font-family: 'Cascadia Mono', Consolas, monospace; font-size: 9pt; background: #f6f5f1; padding: 1px 4px; border-radius: 3px; }
  a { color: var(--ink-2); text-decoration: underline; text-underline-offset: 2px; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 16pt 0; }
  blockquote { margin: 0 0 10pt; padding: 8pt 12pt; background: var(--accent-soft); border-radius: 6px; color: var(--ink-2); break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12pt; font-size: 9.5pt; break-inside: avoid; }
  th { text-align: left; font-weight: 500; color: var(--muted); border-bottom: 1px solid var(--line); padding: 5pt 6pt; }
  td { border-bottom: 1px solid var(--line); padding: 5pt 6pt; vertical-align: top; }
  tr { break-inside: avoid; }
</style>
</head>
<body>
${body}
</body>
</html>`;

const args = process.argv.slice(2);
const keepHtml = args.includes('--keep-html');
const [input, output] = args.filter((a) => !a.startsWith('--'));
if (!input) {
  console.error('Usage: npm run pdf -- docs/some-file.md [out.pdf]');
  process.exit(1);
}
const source = path.resolve(ROOT, input);
const pdfPath = path.resolve(ROOT, output ?? source.replace(/\.md$/, '.pdf'));
const htmlPath = `${pdfPath.replace(/\.pdf$/, '')}.print.html`;

const markdown = await readFile(source, 'utf8');
const title = (/^#\s+(.*)$/m.exec(markdown)?.[1] ?? path.basename(source, '.md')).trim();
await writeFile(htmlPath, page(title, toHtml(markdown)), 'utf8');

const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) {
  console.error(`Wrote ${path.relative(ROOT, htmlPath)}, but found no Edge or Chrome to print it with.`);
  process.exit(1);
}

await run(browser, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--virtual-time-budget=5000',
  `--print-to-pdf=${pdfPath}`,
  `file:///${htmlPath.replace(/\\/g, '/')}`,
]);
if (!keepHtml) await unlink(htmlPath).catch(() => {});
console.log(`${path.relative(ROOT, pdfPath)}`);
