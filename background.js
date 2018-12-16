/* "Superior Supreme Bot" */

chrome.browserAction.onClicked.addListener(function() {
   chrome.tabs.create({
      'url':chrome.runtime.getURL('index.html')
   });
});

class Log {
   constructor() {
      this.log = '';
   }

   clear() {
      this.log = '';
      chrome.runtime.sendMessage({ action: 'log', logText: this.log });
   }
   push(x) {
      this.log += this.gettime() + x + '<br>';
      chrome.runtime.sendMessage({ action: 'log', logText: this.log });
   }

   gettime() {
      let date = new Date();
      let hours = date.getHours();
      let minutes = date.getMinutes();
      hours < 10 ? hours = '0' + hours : false;
      minutes < 10 ? minutes = '0' + minutes : false;
      return '[' + hours + ':' + minutes + '] ';
   }
}

class Item {
   constructor() {

      this.keywords = new Array();
      this.cats = new Array();
      this.targetColorSizePairs = new Array();

      this.availableStyles = new Array();
      this.decidedStyle = undefined;
   }

   addDocument(doc) {
      let actionUrl = 'https://www.supremenewyork.com' + $('#cart-addf', doc).attr('action');

      let colorName = $('[itemprop="model"]', doc).html();
      let colorId = $('#style', doc).val();
      let isColorSoldout = $('[data-style-id="'+colorId+'"]', doc).attr('data-sold-out') !== 'false';
      let color = new Color(colorName, colorId, isColorSoldout);

      let sizeOptions = $(doc).find('#size').find('option');

      // If inside #size there are no option tags (:= sizeOptions.length = 0)
      // then it is an item that only has one size
      // and its id is stored in a hidden input with
      // the same id (size).
      if (sizeOptions.length > 0) {
         for (let option of sizeOptions) {

            let sizeName = $(option).html();
            let sizeId = $(option).val();
            let size = new Size(sizeName, sizeId);

            this.availableStyles.push(new Style(color, size, actionUrl));
         }
      } else {
         let sizeName0 = 'N/A';
         let sizeId0 = $('input:hidden[id="size"]', doc).val();
         let size0 = new Size(sizeName0, sizeId0);
         this.availableStyles.push(new Style(color, size0, actionUrl));
      }
   }

   decideOnStyle() {
      for (let pair of this.targetColorSizePairs) {
         for (let style of this.availableStyles) {
            if (style.color.name.toLowerCase() === pair.colorName.toLowerCase() &&  style.size.name.toLowerCase() === pair.sizeName.toLowerCase() && !style.color.isSoldout) {
               this.decidedStyle = style;
               return;
            }
         }
      }
   }

   addToCart() {
      let self = this;

      return new Promise((resolve, reject) => {

         self.decideOnStyle();
         if (self.availableStyles.length == 0) {
            reject('Failed to find (or sold-out) ' + self.getInfo());
         }
         else if (self.decidedStyle === undefined) {
            reject('Failed to find style for ' + self.getInfo());
         }
         else {
            let r = new XMLHttpRequest();
            r.open('POST', self.decidedStyle.actionUrl);
            r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            r.onload = () => resolve();

            r.onerror = () => reject('Network error while adding to cart.');
            r.send('utf8=✓&style='+self.decidedStyle.color.id+'&size='+self.decidedStyle.size.id+'&commit=add to basket');
         }
      });
   }

   cleanUp() {
      this.availableStyles = new Array();
      this.decidedStyle = undefined;
   }

   getInfo() {
      return 'Item "KEYWORDS: '+this.keywords.toString()+'"';
   }
}

class Style {
   constructor(color, size, actionUrl) {
      this.color = color;
      this.size = size;
      this.actionUrl = actionUrl;
   }
}

class Size {
   constructor(name, id) {
      this.name = name;
      this.id = id;
   }
}

class Color {
   constructor(name, id, isSoldout) {
      this.name = name;
      this.id = id;
      this.isSoldout = isSoldout;
   }
}

class Profile {
   constructor() {
      this.billingInfo = {};
      this.dropItems = new Array();

      this.dropTimestamp = null
      this.dropInterval = null;
      this.dropRefreshRate = 2000; // ms

      this.stockItems = new Array();
      this.stockInterval = null;
      this.stockRefreshRate = 60000; // ms

      this.checkoutInNewTab = false;
      this.checkoutTabId = null;

      this.addToCartDelay = 500; // ms
      this.checkoutDelay = 500; // ms
   }

   startDrops(timestamp) {
      let self = this;

      self.dropTimestamp = timestamp;
      clearInterval(self.dropInterval);

      self.dropInterval = setInterval(function() {
         if (timestamp <= new Date().getTime()) {

            clearInterval(self.dropInterval);

            LOG.push('Processing drop...');
            self.execute();
         }
      }, 500);
      // using interval here instead of timeout because it's more accurate
      // maximum error that can happen is 500 ms since interval is
      // set to this value
   }

   stopDrops() {
      clearInterval(this.dropInterval);
      this.dropTimestamp = null;
   }

   execute() {
      let self = this;

      let allCatNames = new Array();
      self.dropItems.forEach((x, i) => allCatNames.concat(x.cats));

      let uniqueCatNames = allCatNames.filter((x, i) => allCatNames.indexOf(x) == i);

      Promise.all(uniqueCatNames.map(name => promiseDocument('https://www.supremenewyork.com/shop/all'+'/'+name)))
      .then(catDocs => {
         // Collect available items in the category documents
         let foundItems = {};
         catNames.forEach((x, i) => {
            foundItems[catNames[i]] = self.findItemsInCatDoc(catDocs[i])
         });

         // For each item of Profile.dropItems attempt to find appropriate item
         // of those found at the category documents
         let promisedDocs = new Array();
         for (let i in self.dropItems) {

            let keywords = self.dropItems[i].keywords;
            let cats = self.dropItems[i].cats;

            // Items whose category is included in array of
            // current item's cats
            let relevantItems = {};
            Object.keys(foundItems).forEach(key => {
               if (cats.includes(key)) {
                  relevantItems[key] = foundItems[key];
               }
            });

            // Find such name that contains one of the keywords
            // as its substring, if it fails to find such name
            // then current item is supposed to be skipped
            function findItem() {

               let currentCats = Object.keys(relevantItems);
               for (let cat of currentCats) {

                  let currentNames = Object.keys(relevantItems[cat]);
                  for (let name of currentNames) {

                     for (let keyword of keywords) {

                        // If found such name, then promise documents
                        // of urls related to it
                        if (name.toLowerCase().includes(keyword.toLowerCase())) {

                           relevantItems[cat][name].forEach(url => {
                              promisedDocs.push(promiseDocument(url).then(doc => self.dropItems[i].addDocument(doc)));
                           });
                           // := break from all loops
                           return true;
                        }
                     }
                  }
               }
               return false;
            }
            findItem();
         }

         // := at least one item was found
         if (promisedDocs.length > 0) {
            return Promise.all(promisedDocs);
         }
         // := no items were found
         else {
            return Promise.reject();
         }
      })
      .then(() => self.fillCart(self.dropItems), () => onNotFound());

      function onNotFound() {
         // Time period for which bot should continue
         // "refreshing" the page
         if (new Date().getTime() - self.dropTimestamp > 40000) {
            self.dropTimestamp = null;
            LOG.push('Stopped drops.');
         } else {
            setTimeout(() => self.execute(), self.dropRefreshRate);
         }
      }

   }

   // Returns Object. Key: item name, Value: Array of its urls
   findItemsInCatDoc(catDoc) {
      let innerArticles = $('article', catDoc).find('.inner-article');
      let aTags = innerArticles.find('h1').find('a');

      let allItemNames = $.map(aTags, function(x, i) {
         return $(x).html();
      });

      let uniqueItemNames = allItemNames.filter((x, idx) => allItemNames.indexOf(x) == idx);

      // Each item has multiple URLs which are urls of the same item but a different color
      let urlsForItems = {};
      for (let name of uniqueItemNames) {
         urlsForItems[name] = new Array();
         for (let a of aTags)
            $(a).html() == name ? urlsForItems[name].push('https://www.supremenewyork.com' + $(a).attr('href')) : false;
      }
      return urlsForItems;
   }

   // Input is an array of objects Item or its children
   fillCart(items) {
      let self = this;

      let addedItems = 0;
      function fillCart(i) {
         if (i > items.length - 1) {
            if (addedItems == 0) {
               LOG.push('No items were added to cart.');
            }
            else {
               LOG.push('Checking out in ' + self.checkoutDelay / 1000 + ' sec');
               setTimeout(() => {
                  if (self.checkoutInNewTab) {
                     chrome.tabs.create({url: 'https://www.supremenewyork.com/checkout'}, tab => {
                        // Content script will finish the work
                        self.checkoutTabId = tab.id;
                     });
                  } else {
                     self.checkoutNow();
                  }
               }, self.checkoutDelay);
            }
         }
         else {
            let delay;
            // if it's the last item to add to cart then set delay to zero
            i == (items.length - 1) ? delay = 0 : delay = self.addToCartDelay;

            function onResolve() {
               LOG.push('Added to cart: ' + items[i].getInfo());
               addedItems++;
               setTimeout(() => fillCart(i + 1), delay);
            }
            function onReject(reason) {
               LOG.push(reason);
               setTimeout(() => fillCart(i + 1), delay);
            }
            items[i].addToCart()
            .then(() => onResolve(), reason => onReject(reason));
         }
      }
      fillCart(0);
   }

   // Fills in form in a tab
   fillFormIn(tabId) {
      let self = this;

      let code = '';
      Object.keys(self.billingInfo).forEach(key => {
         code += 'document.getElementsByName("'+key+'")[0].value = "' + self.billingInfo[key] + '";';
         console.log(key, self.billingInfo[key]);
      });
      code += 'document.getElementById("order_terms").value = "1";';
      chrome.tabs.executeScript(tabId, {code: code});
   }

   checkoutNow() {
      let self = this;

      let r = new XMLHttpRequest();
      r.open('POST', 'https://www.supremenewyork.com/checkout.json');
      r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      r.onload = () => {
         LOG.push('Checkout response:');
         let response = JSON.parse(r.responseText);
         Object.keys(response).forEach(key => {
            if (key === 'page') {
               let str = unescape(response[key]);
               while (str.includes('href=')) str = str.replace('href', 'abcdef');
               LOG.push(str);
            } else {
               LOG.push(key + ': ' + JSON.stringify(response[key]));
            }
         });
      }
      r.onerror = () => LOG.push('Network error while checkig out');
      let data = {}
      // Iterating through keys instead of assigning in order to avoid
      // changing self.billingInfo itself
      Object.keys(self.billingInfo).forEach(key => data[key] = self.billingInfo[key]);
      data['order[terms]'] = 1;
      r.send(postifyDict(data));
   }

   addDropItem(item) {
      this.dropItems.push(item);
   }

   deleteDropItem(idx) {
      this.dropItems = this.dropItems.filter((x, i) => i != idx);
   }

   setDropItemKeywords(index, keywords) {
      this.dropItems[index].keywords = keywords;
   }

   setDropItemCats(index, cats) {
      this.dropItems[index].cats = cats;
   }

   setDropItemStyles(index, styles) {
      this.dropItems[index].targetColorSizePairs = styles;
   }

   setBillingInfo(binfo) {
      this.billingInfo = binfo;
   }

   getBillingInfo() {
      return this.billingInfo;
   }

   // Stock
   startStocks() {
      let self = this;
      clearInterval(self.stockInterval);
      self.stockInterval = setInterval(() => self.checkStocks(), self.stockRefreshRate);
   }

   stopStocks() {
      clearInterval(this.stockInterval);
      this.stockInterval = null;
   }

   checkStocks() {
      let self = this;

      promiseDocument('https://www.supremecommunity.com/restocks/eu/')
      .then(stocksDoc => {
         let foundItems = findStockItems(stocksDoc);

         // Promises of general item pages
         let promisedItemDocs = new Array();

         // Promises of particular style pages
         // (every supreme item's color has its own page/URL)
         let promisedStyleDocs = new Array();

         for (let i in self.stockItems) {
            let keywords = self.stockItems[i].keywords;

            // Find such name that contains one of the keywords
            // as its substring, if it fails to find such name
            // then current item is supposed to be skipped
            function findItem() {

               let currentNames = Object.keys(foundItems);
               for (let name of currentNames) {

                  for (let keyword of keywords) {

                     // If found such name, then promise documents
                     // of urls related to it
                     if (name.toLowerCase().includes(keyword.toLowerCase())) {

                        promisedItemDocs.push(promiseDocument(foundItems[name].supremeUrl)
                        .then(doc1 => {
                           promisedStyleDocs.push(promiseDocument('https://www.supremenewyork.com' + $('[data-style-id="'+foundItems[name].styleid+'"]', doc1).attr('href')).then(doc2 => {
                              self.stockItems[i].addDocument(doc2);
                           }));
                        }));
                        // := break from all loops
                        return true;
                     }
                  }
               }
               return false;
            }
            findItem();
         }

         // At least one item was found
         if (promisedItemDocs.length > 0) {
            Promise.all(promisedItemDocs)
            .then(() => Promise.all(promisedStyleDocs))
            .then(() => self.fillCart(self.stockItems));
         }
      });

      function findStockItems(stocksDoc) {

         let temp = $('[data-itemname]', stocksDoc).toArray().map(function(x) {
            return {
               name: $(x).attr('data-itemname'),
               supremeUrl: 'https://www.supremenewyork.com/shop/' + $(x).attr('data-itemid'),
               color: $(x).attr('data-itemcolor'),
               styleid: $(x).attr('data-styleid'),
               timeago: new Date().getTime() - new Date($(x).find('.timeago').attr('datetime')).getTime()
            }
         });
         let items = {};
         temp.forEach(x => {
            // Only care about items that appeared in stock recently
            if (x.timeago < self.stockRefreshRate*2) {
               items[x.name] = {supremeUrl: x.supremeUrl, styleid: x.styleid, color: x.color};
            }
         });

         return items;
      }

   }

   addStockItem(item) {
      this.stockItems.push(item);
   }

   deleteStockItem(idx) {
      this.stockItems = this.stockItems.filter((x, i) => i != idx);
   }

   setStockItemKeywords(index, keywords) {
      this.stockItems[index].keywords = keywords;
   }

   setStockItemStyles(index, styles) {
      this.stockItems[index].targetColorSizePairs = styles;
   }
}

let PROFILE = new Profile();
let LOG = new Log();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

   if (request.action === 'get-binfo') {
      sendResponse(PROFILE.getBillingInfo());
   }

   else if (request.action === 'save-binfo') {
      PROFILE.setBillingInfo(request.binfo);
   }

   // Drop
   else if (request.action === 'get-drop-items') {
      let items = PROFILE.dropItems.map((x, i) => {
         return {
            keywords: x.keywords,
            cats: x.cats,
            styles: x.targetColorSizePairs,
            index: i
         }
      });

      sendResponse(items);
   }

   else if (request.action === 'add-drop-item') {
      PROFILE.addDropItem(new Item());
   }

   else if (request.action === 'delete-drop-item') {
      PROFILE.deleteDropItem(request.index);
   }

   else if (request.action === 'set-drop-item-keywords') {
      PROFILE.setDropItemKeywords(request.index, parseKeywords(request.keywords));
   }

   else if (request.action === 'set-drop-item-cats') {
      PROFILE.setDropItemCats(request.index, parseCats(request.cats));
   }

   else if (request.action === 'set-drop-item-styles') {
      PROFILE.setDropItemStyles(request.index, parseStyles(request.styles));
   }

   else if (request.action === 'get-drop-dates') {
      queryDropDates().then(dates => {

         let selected;

         PROFILE.dropTimestamp === null
         ? selected = 'Select drop date'
         : selected = 'will run:' +epochToDate(PROFILE.dropTimestamp);

         sendResponse({dates:dates, selected: selected});
      });
      return true;
   }

   else if (request.action === 'start-drops') {

      let noDatePicked = request.epoch === '';
      let noItemsPicked = PROFILE.dropItems.length < 1;
      let noKeywordsPicked = PROFILE.dropItems.find(item => item.keywords.length < 1);
      let noStylesPicked = PROFILE.dropItems.find(item => item.targetColorSizePairs.length < 1) !== undefined;
      let noCategoriesPicked = PROFILE.dropItems.find(item => item.cats.length < 1) !== undefined;

      if (noDatePicked) {
         LOG.push('You\'ve not picked a drop date.');
         return;
      } else {}


      if (noItemsPicked) {
         LOG.push('You\'ve not picked any drop items.');
         return;
      } else {}

      if (noKeywordsPicked) {
         LOG.push('You\'ve not picked keywords for at least one item.');
         return;
      } else {}

      if (noStylesPicked) {
         LOG.push('[Warning] You\'ve not picked styles for at least one drop item.');

      } else {}

      if (noCategoriesPicked) {
         LOG.push('You\'ve not picked categories for at lease one drop item.');
         return;
      } else {}

      queryDropDates().then(dates => {
         if (Object.values(dates).includes(request.epoch)) {

            for (let i in PROFILE.items) {
               PROFILE.items[i].cleanUp();
            }
            PROFILE.stopDrops();
            PROFILE.startDrops(request.epoch);
            LOG.push('Bot will run at ' + Object.keys(dates).find(x => dates[x] == request.epoch));

         } else {
            LOG.push('[Error] Invalid drop date (the reason might be that drop dates have changed, reloading the page should help).');
         }
      });


   }

   else if (request.action === 'stop-drops') {
      PROFILE.stopDrops();
      LOG.push('Stopped drops.');
   }

   // Stock
   else if (request.action === 'get-stock-items') {

      let items = PROFILE.stockItems.map((x, i) => {
         return {
            keywords: x.keywords,
            cats: x.cats,
            styles: x.targetColorSizePairs,
            index: i
         }
      });

      sendResponse(items);
   }

   else if (request.action === 'add-stock-item') {
      PROFILE.addStockItem(new Item());
      sendResponse();
   }

   else if (request.action === 'delete-stock-item') {
      PROFILE.deleteStockItem(request.index);
   }

   else if (request.action === 'set-stock-item-keywords') {
      PROFILE.setStockItemKeywords(request.index, parseKeywords(request.keywords));
   }

   else if (request.action === 'set-stock-item-styles') {
      PROFILE.setStockItemStyles(request.index, parseStyles(request.styles));
   }

   else if (request.action === 'start-stocks') {

      let noItemsPicked = PROFILE.stockItems.length < 1;
      let noKeywordsPicked = PROFILE.stockItems.find(item => item.keywords.length < 1);
      let noStylesPicked = PROFILE.stockItems.find(item => item.targetColorSizePairs.length < 1) !== undefined;

      if (noItemsPicked) {
         LOG.push('You\'ve not picked any stock items.');
         return;
      } else {}

      if (noKeywordsPicked) {
         LOG.push('You\'ve not picked a keywords for at least one item.');
         return;
      } else {}

      if (noStylesPicked) {
         LOG.push('[Warning] You\'ve not picked styles for at least one drop item.');
      } else {}

      PROFILE.startStocks();
      LOG.push('Started stocks.');
   }

   else if (request.action === 'stop-stocks') {
      PROFILE.stopStocks();
      LOG.push('Stopped stocks.');
   }


   else if (request.action === 'fill-form-in') {
      if (PROFILE.checkoutTabId == sender.tab.id) {
         PROFILE.fillFormIn(sender.tab.id);
         PROFILE.checkoutTabId = null;
      } else {}
   }

   else if (request.action === 'set-settings') {

      if (!isNaN(request.stockRefreshRate)) {
         PROFILE.stockRefreshRate = restrainValue(request.stockRefreshRate, 10000, 1800000);
      }
      if (!isNaN(request.dropRefreshRate)) {
         PROFILE.dropRefreshRate = restrainValue(request.dropRefreshRate, 100, 10000);
      }
      if (!isNaN(request.addToCartDelay)) {
         PROFILE.addToCartDelay = restrainValue(request.addToCartDelay, 0, 5000);
      }
      if (!isNaN(request.checkoutDelay)) {
         PROFILE.checkoutDelay = restrainValue(request.checkoutDelay, 0, 10000);
      }
      if (!isNaN(request.checkoutInNewTab)) {
         PROFILE.checkoutInNewTab = request.checkoutInNewTab;
      }
   }

   else if (request.action === 'get-settings') {
      sendResponse({
         stockRefreshRate: PROFILE.stockRefreshRate,
         dropRefreshRate: PROFILE.dropRefreshRate,
         addToCartDelay: PROFILE.addToCartDelay,
         checkoutDelay: PROFILE.checkoutDelay,
         checkoutInNewTab: PROFILE.checkoutInNewTab
      });
   }

   else if (request.action === 'clear-log') {
      LOG.clear();
   }

   else if (request.action === 'get-log') {
      sendResponse(LOG.log);
   }

});

// NOTE: This function should return a dictionary, example:
// {'date_string': epoch, ...}
// It used to query for the string from superiorbot website

// Tt's up to you where you get the dictionary, it may be even hard-coded
// (drop dates are not consistent)
function queryDropDates() {
   //return {'12-Nov-1999': 123123123};
   return new Promise((resolve, reject) => {
      let r = new XMLHttpRequest();
      r.open('GET', 'https://<URL>/drops.json');
      r.setRequestHeader('Cache-Control', 'no-cache');
      r.onload = () => {
         resolve(JSON.parse(r.responseText));
      }
      r.send();
   });
}

function promiseDocument(url) {
   return new Promise((resolve, reject) => {
      let r = new XMLHttpRequest();
      r.open('GET', url);
      r.onload = function() {
         resolve($(r.responseText));
      }
      r.onerror = () => reject('Network error');
      r.send();
   });
}

function postifyDict(dict) {
   let result = "";
   Object.keys(dict).forEach(function(key) {
      result += key + '=' + dict[key] + '&';
   });
   result = result.slice(0, result.length - 1);
   return result;
}

// returns Levenshtein distance for two strings
function strDistance(str1, str2) {

   str1 = Array.from(str1);
   str2 = Array.from(str2);

   let matrix = new Array(str1.length + 1).fill(null).map(x => new Array(str2.length + 1).fill(null));

   for (let i = 0; i < str1.length + 1; i++) {
      matrix[i][0] = parseInt(i);
   }
   for (let j = 0; j < str2.length + 1; j++) {
      matrix[0][j] = parseInt(j);
   }
   for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
         let notEqual = str1[i - 1] !== str2[j - 1];
         matrix[i][j] = Math.min(matrix[i][j-1], matrix[i-1][j], matrix[i-1][j-1]) + notEqual;
      }
   }

   return matrix[str1.length][str2.length];
}

function epochToDate(epoch) {
   let dateStr = new Date(parseInt(epoch)).toString();
   let dateArray = dateStr.split(' ');
   let monthName = dateArray[1];
   let day = dateArray[2];
   let year = dateArray[3];
   let time = dateArray[4].split(':');
   time = time[0] + ':' + time[1];
   return monthName + ' ' + day + ' ' + year + ' ' + time;
}

function parseStyles(str) {
   if (str == undefined) return new Array();

   while (str.indexOf('  ') != -1) str = str.replace('  ', ' ');
   while (str.indexOf(', ') != -1) str = str.replace(', ', ',');
   while (str.indexOf(' ,') != -1) str = str.replace(' ,', ',');
   while (str.indexOf('] ,') != -1) str = str.replace('] ,', '],');
   while (str.indexOf(', [') != -1) str = str.replace(', [', ',[');
   while (str.indexOf('[ ') != -1) str = str.replace('[ ', '[');
   while (str.indexOf(' ]') != -1) str = str.replace(' ]', ']');
   while (str.indexOf('[ ') != -1) str = str.replace('[', '');
   while (str.indexOf(' ]') != -1) str = str.replace('[', '');

   let pairs = str.split('],[').map(x => {
      let y = {
         sizeName: x.replace(']', '').replace('[', '').split(',')[0],
         colorName: x.replace(']', '').replace('[', '').split(',')[1]
      }
      if (y.sizeName === undefined || y.sizeName === '') {
         y.sizeName = '?';
      }
      if (y.colorName === undefined || y.colorName === '') {
         y.colorName = '?';
      }
      return y;
   });
   return pairs;
}

function parseKeywords(str) {
   if (str == undefined) return new Array();

   while (str.indexOf(', ') != -1) str = str.replace(', ', ',');
   let keywords = str.split(',').filter(x => x !== '');
   return keywords;
}

function parseCats(str) {
   if (str == undefined) return new Array();

   let existingCats = [
      'jackets',
      'shirts',
      'shirts',
      'tops_sweaters',
      'sweatshirts',
      'pants',
      'hats',
      'bags',
      'accessories',
      'skate',
      't-shirts'
   ];

   let pickedCats = str.split(',').filter(x => x !== '' && x.length >= 2).filter((x, i) => i < 3);
   for (let i in pickedCats) {
      pickedCats[i] = findBestMatch(pickedCats[i], existingCats);
   }

   function findBestMatch(str1, arr) {
      let scores = new Array(arr.length);

      let bestIdx = 0;
      for (let i in arr) {
         scores[i] = strDistance(str1, arr[i]);
         if (scores[i] < scores[bestIdx]) {
            bestIdx = i;
         }
      }
      return arr[bestIdx];
   }
   return pickedCats;
}

function restrainValue(value, min, max) {
   value = Math.max(value, min);
   value = Math.min(value, max);
   return value;
}
