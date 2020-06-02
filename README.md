# supreme-store-bot
This bot uses XMLHttpRequest to cop items from supreme online store.

### How to install
1. Clone this repository
2. Go to chrome://extensions/ in your browser
3. Click 'load unpacked', select ./supreme-store-bot/src
4. The extension will appear in the top-right corner of your browser

### How to use
1. The bot will only start catching drops at a particular point of time. You can set multiple points of time in src/background.js by changing ```const DROP_DATES``` object. Keys can be anything (usually something like ```'19-Sep-2018'```), values must be timestamps in milliseconds, at which bot will trigger and start catching items.
2. Fill in the billing form at the bottom of the extension page.
3. Add items.
4. Select drop date and click ```activate```.
