# Haopeng (Jack) Xie's personal website

Static HTML, CSS, and JavaScript, published from `main` by GitHub Pages. No build step is required.

## Layout

```text
index.html                         Homepage
assets/
  css/                             Shared site styles and homepage decoration
  js/                              Shared navigation, chart helpers, and autoplay
  images/                          Profile artwork and shared university logo
  documents/                       Public CV
research/
  index.html                       Research listing
  <entry>/
    index.html                     Paper page
    assets/images/                 Figures owned by this paper
    assets/js/                     Paper-specific figure code and data
experience/
  <entry>/
    index.html                     Experience page
    assets/images/                 Organization-specific images, where needed
projects/
  <entry>/
    index.html                     Project page
    assets/images/                 Project-specific artwork
    assets/js/                     Project-specific code, where needed
```

Keep entry-specific assets beside that entry's `index.html`. Listings and feature cards reference the owning entry's images directly; avoid copying thumbnails into a central folder. Only files used across entries belong in the root `assets/` folders.

The tone and word order page includes the EMNLP paper's German example and distribution reference. It loads those scripts from `research/cross-lingual-prosody/assets/js/` so the original data has one maintained copy. ThoughtTrace's example animation is stored locally with its page; the page retains attribution to the original project site.

When editing a stylesheet or script, update its `?v=` value in the pages that load it to avoid stale browser caches. Versions currently use the first 12 characters of the file's SHA-256 hash.

## Preview

From the repository root:

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765`. Stop the preview with Ctrl+C when finished. Use an HTTP server for Hangman, which imports an ES module.
