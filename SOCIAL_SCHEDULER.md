# Social scheduler — setup

This replaces Buffer. Posts are written and approved here in the admin panel,
then the scheduler sends them out at the right time.

**Step 1 is built:** the database tables, the Accounts page, Facebook and
Instagram sign-in, and the activity trail that records everything anyone does.

**Nothing can post yet.** That is step 2.

---

## What each channel can do

| Channel | Posts by itself? | Why |
|---|---|---|
| Instagram | Yes | Business account joined to the Facebook Page |
| Facebook Page | Yes | Same Meta app, Page token |
| TikTok | No | The video goes to your drafts. Someone taps post. TikTok must check our app first before it can post on its own |
| YouTube Shorts | Yes | Stays unlisted until Google checks the app |
| WhatsApp Channel | No | WhatsApp has no tool for this. You get an email with the words and the picture, ready to post by hand |

Do not look for a way around the WhatsApp one. The services that claim to do it
run a copy of WhatsApp on a real phone number, and that number can be banned.
Not worth the business line.

---

## 1. Create the Meta app

Do this once. It takes about fifteen minutes.

1. Go to `developers.facebook.com/apps` and click **Create app**.
2. Choose **Business**. Call it something like `Homebest Social`.
3. Add the **Facebook Login** product.
4. Open **Facebook Login → Settings** and paste **both** of these into
   *Valid OAuth Redirect URIs*, one per line:

   ```
   https://www.homebestregionallimited.com/api/social/oauth/meta/callback
   https://homebest-three.vercel.app/api/social/oauth/meta/callback
   ```

   The shop answers on both addresses. The code sends whichever one `SITE_URL`
   holds, so listing both means it works either way. Copy them exactly: Meta
   matches the whole address, including `https` and no slash at the end.
5. Open **App settings → Basic** and copy the **App ID** and the **App secret**.
6. Check that the Instagram account is a **Business** account and is joined to
   the Facebook Page. Instagram will not post from a personal account.
7. Check that the Facebook user signing in has a role on that Page.

You do **not** need App Review. That is only for apps posting to accounts
somebody else owns. Homebest owns these accounts, so permission is given
straight away.

---

## 2. Add the keys

In Vercel, **Settings → Environment Variables**. No quotes around the values.

```
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

Only if Meta brings out a newer version later:

```
META_GRAPH_VERSION=v26.0
```

Needed in step 3, when posts start going out on their own:

```
CRON_SECRET=any_long_random_string
```

**Step 3 needs the Vercel Pro plan.** This project is on Hobby today, and Hobby
only allows a timer that runs **once a day** — a schedule like every five
minutes is refused when the site is built. The scheduler cannot post on time
without it. Pro is $20 a month, and the shop needs it anyway before it can take
payments.

Redeploy after adding them. Keys are only read when the site is built.

---

## 3. Make the tables — already done

This was run against Homebest's Supabase project on 21 November 2026. Seven
tables, row level security on all of them, the `social-media` bucket, and the
Homebest brand are all in place. The shop's own tables were not touched.

You only need this again if you rebuild the database. The file is safe to run
any number of times: open **Supabase → SQL editor**, paste in
`supabase/social_scheduler.sql`, and run it.

It makes seven tables, turns on row level security with no public access, and
creates a public storage bucket called `social-media`. That bucket has to be
public: every social platform fetches the picture or video from a public link,
so a private bucket cannot work.

---

## 4. Connect Instagram and Facebook

1. Open `/admin/social/accounts`.
2. Click **Connect Instagram and Facebook**.
3. Approve on Facebook and tick the Page.
4. You come back to the Accounts page and see the Page and the Instagram
   account listed.

Step 1 is finished when the account shows as Connected.

A Page sign-in made this way usually never runs out, so the card may say
"Sign-in does not run out". That is correct, not a mistake.

---

## 5. The social media manager

The manager signs up like anyone else, then you change their role. In the
Supabase SQL editor, with their email:

```sql
update users set role = 'social_manager' where email = 'their@email.com';
```

What that role **can** do:

- Open `/admin/social` and everything in it
- Write, time and approve posts
- Connect and remove social accounts

What it **cannot** do:

- See orders, customers, products, prices, categories or delivery
- Those need the `admin` role, and the admin check already blocks anyone else.
  If they type `/admin/orders` they are sent back to the scheduler.

**Never give a social media manager the `admin` role.** That opens the orders and
the prices. The `social_manager` role exists so you never have to make that
choice.

To take the access away:

```sql
update users set role = 'student' where email = 'their@email.com';
```

---

## 6. The activity trail

Every action writes one line to `social_activity`: who did it, what they
touched, the time, and their IP address. Open `/admin/social/activity` to read
it, newest first, grouped by day, in Nairobi time. You can also pick one person
and see only their work.

Three things worth knowing:

- There is no way to change or remove a line from inside the app. Not for the
  manager, and not for you. Only someone with database access can.
- A trail that fails to save never stops the work. It records, it does not block.
- No sign-in key ever reaches the trail. Details are cleaned twice before they
  are saved: once by name, once by pattern.

Recorded so far: sign-in started, connected, sign-in failed, account removed.
The post actions are already named in `lib/social/activity.js` and get wired up
as each step of the build adds them.
