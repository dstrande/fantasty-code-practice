# Fantasy Code

Practise SQL against fantasy-themed databases. Write queries in the browser, run them
against a real SQLite database, and get them marked automatically.

The first setting, **Thornwick Vale**, is a guild ledger of adventurers, parties, quests,
spells, magic items and monsters. It has 20 questions, from `SELECT` basics up to
recursive CTEs and window functions.

Everything runs in the browser: SQLite runs as WebAssembly ([sql.js](https://sql.js.org)),
so there's no server.

## Running it

Requires Node.js 20 or later.

```sh
npm install
npm run dev        # http://localhost:5173 (or double-click start.bat on Windows)
npm test           # checker tests, and every question's solution checked against its database
npm run build      # static site in dist/
```

## How answers are checked

Your SQL and the reference solution each run on a fresh copy of the database. Their final
result sets are then compared **by value**:

- Column names don't matter, but column order does.
- Row order only matters when the question asks for a particular order.
- For questions that change data, a hidden query reads the table after your SQL runs, and
  that result is compared instead.

## Adding content

Each setting is a folder in `content/<language>/<setting-id>/`:

| File | Contents |
|---|---|
| `setting.yaml` | Name, description and attribution |
| `schema.sql` | `CREATE TABLE` statements |
| `seed.sql` | `INSERT` statements |
| `questions.yaml` | Questions. The field reference is at the top of the existing file |

`npm test` checks every setting: the database must build, every reference solution must
return rows, pass its own check, and reject an obviously wrong answer.

### Private content

`content-private/` uses the same layout but is git-ignored. Use it for settings you can't
publish, such as ones based on copyrighted works. The app and the tests load private
packs automatically.

## Credits

The Thornwick Vale setting includes material taken from the System Reference Document 5.1
("SRD 5.1") by Wizards of the Coast LLC, available at
https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under
the Creative Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode. Towns, adventurers, parties, quests
and encounters are original to this project.

Fantasy Code is not affiliated with or endorsed by Wizards of the Coast.
