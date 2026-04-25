## ADDED Requirements

### Requirement: /references page lists every authoritative source

The webapp SHALL expose a `/references` route as a Server Component listing every source in the bibliography (Husić, Kadriu, uniparser, Kaikki, UD-Albanian-TSA, UD-Albanian-STAF, Kote/Biba, Newmark/Hubbard, Wikipedia). Each entry SHALL include: author(s), title, year, publisher or platform, URL when applicable. The page SHALL be statically pre-rendered.

#### Scenario: Bibliography lists at least seven sources

- **WHEN** the user requests `GET /references`
- **THEN** the response status SHALL be 200
- **AND** the rendered HTML SHALL contain headings or list items naming at least Husić, Kadriu, uniparser, Kaikki, and Universal Dependencies

### Requirement: Each source has a BibTeX block

For every source in the bibliography, the page SHALL render an inline `<code>`/`<pre>` block containing a BibTeX entry the user can copy directly. The BibTeX type SHALL be appropriate to the source (`@book` / `@misc` / `@software` / `@inproceedings`).

#### Scenario: Husić's manual has a @book BibTeX entry

- **WHEN** the user views `/references`
- **THEN** the page SHALL contain a BibTeX block including `@book{` and `Husi{\\'c}` (the LaTeX-escaped accent) or `Husic`

### Requirement: Cite-this-engine block on /references

The `/references` page SHALL include a "Cite foljapp" section with a BibTeX entry for the engine + corpus combination, dynamically including the current `engineVersion` and `corpusVersion`.

#### Scenario: Cite-foljapp BibTeX includes versions

- **WHEN** the user views `/references`
- **THEN** the page SHALL contain a BibTeX block of type `@software` referencing `foljapp` and including a `version` field matching `engineVersion`

### Requirement: Cite-this-verb action on verb pages

Every `/verb/[lemma]` page SHALL include a Cite control that, when activated, surfaces a BibTeX `@misc` entry citing the verb's foljapp page. The entry SHALL include `title` (lemma + translation), `author` (`{foljapp contributors}`), `year`, `url` (the verb page), and a `note` field containing engine + corpus versions.

#### Scenario: Cite control is present and produces a BibTeX entry

- **WHEN** the user visits `/verb/punoj`
- **THEN** the page SHALL render a control labeled `Cite` (button or link)
- **AND** activating the control SHALL surface or copy a BibTeX entry including `@misc{`, `punoj`, and `to work`
