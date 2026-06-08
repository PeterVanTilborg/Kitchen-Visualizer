# Wrap-Up AI — How-To Notes

> Quick reference for managing the app without needing to ask a developer.

---

## 🖼 Logo

**File location in GitHub:**
`client/public/logo-wrapup.svg`

**To update the logo:**
1. Go to: https://github.com/PeterVanTilborg/wrap-up-ai/tree/main/client/public
2. Click on `logo-wrapup.svg`
3. Click the pencil icon (Edit) → then the three dots → "Delete file" to remove the old one
   — OR — click "Add file" → "Upload files" to upload a new version with the **same filename**
4. Commit directly to main
5. Railway deploys automatically in ~3–5 minutes

**Important:** The filename must stay `logo-wrapup.svg` — the code points to that exact name.
Accepted formats: SVG (recommended), PNG with transparent background.

---

## 🔐 Admin Panel

**URL:** https://wrap-up-ai-production.up.railway.app/admin

If you need to reset your admin password, click **Forgot your password?** on the admin login page.

**What you can do there:**
- View all user emails and generated designs
- See usage stats
- Manage credits and packages
- Adjust rate limits

---

## 🚀 Deployments

The app is hosted on **Railway** and auto-deploys every time a change is pushed to the `main` branch on GitHub. No manual action needed.

**Typical deploy time:** 3–5 minutes after a commit.

**Live URL:** https://wrap-up-ai-production.up.railway.app

---

## ✏️ Text Changes (Headlines, Taglines)

**File to edit:**
`client/src/pages/home.tsx`

**Current headline:** "Visualize your dream wrap"
**Current tagline:** "Click it, before you stick it"

To change these, ask your developer (or Claude) to edit that file — it's a simple text swap.

---

## 🎨 Colors / Wrap Options

Wrap color images are stored in:
`client/public/colors/`

To add a new color: upload the image file there, then use the Admin Panel → Reset Colors to reload them into the database.

---

## 📁 Key File Locations

| What | Where |
|------|-------|
| Logo | `client/public/logo-wrapup.svg` |
| Home page | `client/src/pages/home.tsx` |
| Admin routes | `server/routes.ts` |
| Color images | `client/public/colors/` |
| Environment variables | Railway dashboard → Variables |

---

*Last updated: March 2026*
