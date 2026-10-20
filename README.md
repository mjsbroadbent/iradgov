# iradgov.org

Official portal of the Office of the Governor of the Irad Special Economic Zone (Irad ARG; lore in
`mjsbroadbent/irad_persona_skill`, see `canon.md`). The site itself is fully in-world; this README is not.

Domain: **iradgov.org** (`CNAME`). E-mail addresses shown on the site: `info@`, `press@`, `letters@iradgov.org`.
DNS: apex A records 185.199.108.153, .109.153, .110.153, .111.153 (AAAA 2606:50c0:8000::153, 8001::153, 8002::153,
8003::153) and `www` CNAME to `mjsbroadbent.github.io`. GitHub Pages: branch `main`, root, custom domain iradgov.org.

## Structure

No build step. Each page is a plain HTML file with its English text inline; `assets/site.js` draws the header,
menu and footer, switches language and renders the data-driven parts.

- Pages: `index.html`, `governor.html`, `lieutenant-governor.html`, `administration.html`, `regions.html`,
  `press.html`, `release.html?id=<id>`, `decrees.html`, `holidays.html`, `symbols.html`, `contact.html`, `404.html`.
- `assets/i18n.js`: `ui` (interface strings, en/ir/ru) and `pages` (Iradi and Russian text for every `data-i18n`
  key in the HTML; the English stays in the HTML). Iradi is the Kyrgyz-based Latin orthography (ı ö ü ñ j ch sh).
  Language is remembered in `localStorage` `iradgov_lang`; `?lang=ru` also works.
- `assets/emblem.svg` (the flag's roundel on a crimson disc), `assets/flag.svg`, favicons made from the emblem.
- Holidays are computed in `site.js` from the Holidays Act list (Easter Monday by the Gregorian reckoning; a
  holiday on a weekend moves to the next free working day).

## Exchange rate

The home page reads the official rate from the shared daily numbers file, `https://iradone.com/data/today.json`
(`rates.official.usd` and `rates.official.rows`), with a 6-second timeout. If it can't be read, it shows the peg,
8.40 som per US dollar. Only a GET; nothing is sent.

## Adding a press release

Add an object to `releases` in `data/press.json` (order doesn't matter; the site sorts by date):

```json
{
  "id": "2026-10-21-short-slug",
  "date": "2026-10-21",
  "type": "lg",
  "source": { "en": "Office of the Lieutenant Governor", "ir": "Vitse-gubernatordun apparatı", "ru": "Аппарат вице-губернатора" },
  "title":   { "en": "…", "ir": "…", "ru": "…" },
  "summary": { "en": "…", "ir": "…", "ru": "…" },
  "body":    { "en": ["paragraph", "paragraph"] },
  "related": ["ed-2026-31"],
  "tags": ["economy"]
}
```

- `type`: `lg` (the Lieutenant Governor's activity; the newest one is the home page's lead item), `governor`,
  `gov`, `ministry`, `statement`, `district`.
- `id` is the address: `release.html?id=<id>`. Keep it unique and stable. Add it to `sitemap.xml`.
- `body` may also have `ir` and `ru` arrays; without them the English is shown with a note that releases are
  published in English. Paragraphs may contain simple HTML (`<a>`, `<i>`).
- `related` lists `id`s from `data/documents.json`.
- Match what IradOne printed; official line only. No real living people.

## Decrees and notices

`data/documents.json` → `documents`: `id`, `kind` (`directive`, `decree`, `bank`, `draft`, `notice`), `date`,
`home` (true to show in the home page's notices), `number`, `issuer`, `status`, `title`, `summary` (all three
languages), `text.en` (paragraphs or one `<ol>`), `signed`. Executive directives are numbered `YYYY/NN` and are
signed "A. Maksat, Lieutenant Governor, acting on the instructions of the Governor" (in the Governor's name since
July 2024).

## Governor's addresses

`data/addresses.json` → `addresses`: `date`, `title`, `summary` (three languages), `text.en`. Official line only:
recorded at the residence, broadcast on IradOne.

## Checking

`python3 -m http.server` in this folder and look at every page in all three languages at desktop and phone
widths. The site must make no requests other than its own files, Google Fonts and the GET of the numbers file.
