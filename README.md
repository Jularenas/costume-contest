# 🎃 Costume Contest

A tiny costume contest website. People post a photo and the costume's name, everyone gets one vote, and the gallery shows a live leaderboard.

The whole site is static: HTML, CSS and JavaScript, with no server code. GitHub Pages hosts it, and a free Supabase project stores the shared entries and votes.

- **Post a costume**: add a photo (shrunk in the browser to about 100 KB), a costume name and, optionally, your own name.
- **Vote once**: tapping another costume moves your vote there, and tapping your current pick removes it.
- **Leaderboard**: costumes are ranked by vote count (ties share a rank), with the leader shown at the top.
- **No duplicates**: as you type a costume name, entries with matching names appear with a Vote button.
- **Live**: the page refreshes every 5 seconds. Search filters the gallery, and tapping a photo enlarges it.

## Local testing

You need Node.js, but there's nothing to install.

```bash
npm start
```

Open http://localhost:3000. On localhost the site runs in **test mode**:

- All data is saved in your browser only, so nothing touches the live contest.
- **Be a new voter** simulates another person, which lets you test vote-once with a single browser.
- **Clear data** wipes your test entries.
- Every card has a **Remove** button.

To test against the real shared database from your machine, open http://localhost:3000/?store=shared.

## Making changes

Edit the files, test locally, then push to `main`:

```bash
git add -A && git commit -m "Describe the change" && git push
```

GitHub Pages redeploys automatically within about a minute.

| File           | What it is                                                        |
|----------------|-------------------------------------------------------------------|
| `index.html`   | Page layout                                                        |
| `style.css`    | Look and feel                                                      |
| `app.js`       | Gallery, voting, photo upload, leaderboard                         |
| `store.js`     | Where data lives: in the browser (test) or in Supabase (live)      |
| `config.js`    | Title, Supabase keys, admin key                                    |
| `supabase.sql` | One-time database setup for the live site                          |
| `dev-server.js`| Local static server for `npm start`                                |

## Go live (shared votes)

Until Supabase is connected, the live site runs in **demo mode**, where each device only sees its own entries. To share entries and votes:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in the contents of `supabase.sql`, and click **Run**.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Paste both into `config.js` (`supabaseUrl`, `supabaseAnonKey`), then commit and push.

The anon key is meant to be public. The tables are deliberately open, so anyone with the site can add, vote and remove entries.

## Admin and wiping the contest

Open the site with `?admin=pumpkin`, or whatever `adminKey` is set to in `config.js`. You get a **Remove** button on each card and a **Wipe contest** button that deletes every costume and vote. This is a convenience, not real security.

## Notes

- "One vote" is per browser, using a random ID kept in the browser's storage. Someone could vote again from a private window or a second device.
- Photos are stored as compressed JPEG data in the database, which is fine for a party-sized contest.
- `index.html` loads CSS and JS with a fresh `?v=` each visit, so changes show up right after a deploy. Only `index.html` itself can be cached (up to 10 minutes) by GitHub Pages.
