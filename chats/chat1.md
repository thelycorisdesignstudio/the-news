# The News UI mockups

_Started 2026-09-24 09:39 UTC_

---

## User

Make UI mockups for The News okay as per our brand themes okay

## Assistant

I'll build this with your **Ink & Signal** brand from the brief: DM Serif Display and Manrope, Surface White, Ink and Signal Blue. The Modernist system attached to the project uses Archivo, red and square corners, which conflicts with your spec, so I'm not using it.

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

I've built all 17 screens in **The News Mockups.dc.html**, plus the card-state matrix. The verifier is still checking the file.

- **Live feed (top phone):** a working prototype. The cards snap as you scroll, the 9-second segment fills, and a chevron pulses once when time is up. Nothing moves on by itself. Heart, share and bookmark work, "read full article →" opens the reader sheet, and the last card is the "you're caught up" screen.
- **Screen 04 (topics):** you can tap the chips. "continue →" turns blue once 3 are picked.
- **Screen 05 (reading speed):** runs the real timer and records how long you took.
- **Brand:** I used your Ink & Signal spec from the brief, not the Modernist design system attached to the project. Modernist uses red, the Archivo font and square corners, which would clash with your brand.
- **Content:** the news stories other than the GPT-5 one are made-up examples.
- **Not built yet:**
  - The list/swipe toggle and profile icon in the live feed don't do anything; screens 14 and 16 show those views as still mockups.
  - The source logos are grey placeholder squares.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

I fixed the "restart session" button next to the live phone so its label now stays on one line.

The only other things the check raised are deliberate. On screen 14, the row of filter pills runs off the edge on purpose, so it reads as a row you can scroll sideways. And I'm not using the Modernist design system because your Ink & Signal brand takes priority.

## User

use the font epilogue Variable only end to end and use HugeIcons Pack only and we need the loading states and error states and skeelton loading and all as well okay and also design a logo as well for us as such okay we keep the The News logo and another logo as well and also login and sign up and all those pages as well okay

Ensure we provide also hyperlocal news and also local news as well okay and also choosing the country and all as well so ensure we give those options and allow them to select as much as possible in the filters they need to follow and all okay and ensure this is done well end to end okay

## Assistant

_[tool: run_script]_

_[tool: web_search]_

_[tool: web_fetch]_

_[tool: snip]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: dc_write]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: ready_for_verification]_

I've built v2 as **The News v2.dc.html** and kept the original file as it was. It's still being checked in the background.

**Throughout:**
- Epilogue is now the only font, and every icon is from the free Hugeicons pack.
- The News logo stays and is now set in Epilogue. There are two options for the second logo: 1a "Nine" (a 3×3 grid of squares with one blue square) and 1b "Stack" (two stacked story cards). Each is shown as an app icon, on light and dark backgrounds, next to the logo, and at small sizes. Tell me which one you want.

**New screens:**
- **Login and sign up:** welcome screen (Apple, Google, email), sign up, log in, wrong password, form errors, logging-in spinner, forgot password, and email code check.
- **Country and local setup:** onboarding now has five steps. The new ones are:
  - Choosing countries, which you can search and pick several of.
  - Choosing how local to go (global, national, state, city, neighbourhood), with a 1 / 3 / 5 / 10 km range for neighbourhood.

  You can tap through both in the preview.
- **Local stories:** new local and hyperlocal story cards show a place tag and distance. They're in the live swipe feed too.
- **Filters:** the filter panel lets you pick several options in each group: coverage, countries, cities and areas, topics, and story type. It has a reset option and a button that shows the story count, and you can tap it in the preview. There's also a country search and a "your places" screen, where each saved place has its own distance range.
- **Loading:** grey placeholder layouts for the feed, list and article view, plus pull to refresh, a "finding local stories" screen, and a sheet showing every state of buttons, fields, chips and pop-up messages.
- **Error and empty screens:** offline (on launch and mid-session), feed didn't load, story removed, location off, nothing nearby, no search results, and signed out.

**Things to know:**
- The free Hugeicons pack has no filled icons. So a liked or saved story shows a coloured icon on a tinted circle instead of a filled heart or bookmark.
- The sample place names (Bengaluru, Indiranagar, Karnataka) are made up for the mockups. Tell me your launch market and I'll swap them.

## User

and also this is our signature gradient okay so use this in the background as such okay so work on this as such okay so it would be better as such okay in the background as such in the splash screens and all screen use thse gradent and not static but the gradient moving ok

## User

and also this is our signature gradient okay so use this in the background as such okay so work on this as such okay so it would be better as such okay in the background as such in the splash screens and all screen use thse gradent and not static but the gradient moving ok

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

The moving gradient was making the whole page too slow to use, so I changed how it moves. The gradient looks the same and still drifts on all 41 screens, but it now slowly shifts and rotates instead of sliding its colours, which the browser can draw much more cheaply.

- Feed cards are now see-through, so the moving background of the phone shows behind them, including in the live feed.
- On the mid-swipe screen (12), the two overlapping cards each have a still copy of the gradient, so their text doesn't show through each other.
- A background check is running to confirm the page is responsive again.

