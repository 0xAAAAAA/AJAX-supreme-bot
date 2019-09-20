
function updateDropItems() {
   chrome.runtime.sendMessage({action: 'get-drop-items'}, function(items) {
      let html = "";
      for (let item of items) {
         html += '<tr item-index="'+item.index+'">';
         html += '   <td class="table-input-td">';
         html += '      <input placeholder="box logo, supreme box" type="text" item-data="keywords" class="table-input" value="'+item.keywords+'">';
         html += '   </td>';
         html += '   <td class="table-input-td">';
         html += '      <input placeholder="tops_sweaters, sweatshirts" type="text" item-data="cats" class="table-input" value="'+item.cats+'">';
         html += '   </td>';

         let styles = "";
         for (let s of item.styles)
            styles += '[' + s.sizeName + ',' + s.colorName + '],';
         styles.length > 0 ? styles = styles.slice(0, styles.length - 1) : false;

         html += '   <td class="table-input-td">';
         html += '      <input placeholder="[xlarge, black], [xlarge, red]" item-data="styles" class="table-input" type="text" value="'+styles+'">';
         html += '   </td>';
         html += '   <td btn-action="remove" class="table-padding rm-item-btn">Remove</td>';
         html += '</tr>';
      }
      $('#drop-items-table').find('tbody').html(html);

      $('#drop-items-table').find('[btn-action="remove"]').click(function() {
         chrome.runtime.sendMessage({
            action: 'delete-drop-item',
            index: $(this).closest('tr').attr('item-index')
         }, () => updateDropItems());
      });

      $('#drop-items-table').find('[item-data="keywords"]').change(function() {
         chrome.runtime.sendMessage({
            action: 'set-drop-item-keywords',
            index: $(this).closest('tr').attr('item-index'),
            keywords: $(this).val()
         }, () => updateDropItems());
      });

      $('#drop-items-table').find('[item-data="cats"]').change(function() {
         chrome.runtime.sendMessage({
            action: 'set-drop-item-cats',
            index: $(this).closest('tr').attr('item-index'),
            cats: $(this).val()
         }, () => updateDropItems());
      });

      $('#drop-items-table').find('[item-data="styles"]').change(function() {
         chrome.runtime.sendMessage({
            action: 'set-drop-item-styles',
            index: $(this).closest('tr').attr('item-index'),
            styles: $(this).val()
         }, () => updateDropItems());
      });

   });
}

function updateStockItems() {
   chrome.runtime.sendMessage({action: 'get-stock-items'}, function(items) {
      let html = "";
      for (let item of items) {
         html += '<tr item-index="'+item.index+'">';
         html += '   <td class="table-input-td">';
         html += '      <input placeholder="box logo, supreme box" type="text" item-data="keywords" class="table-input" value="'+item.keywords+'">';
         html += '   </td>';

         let styles = "";
         for (let s of item.styles)
            styles += '[' + s.sizeName + ',' + s.colorName + '],';
         styles.length > 0 ? styles = styles.slice(0, styles.length - 1) : false;

         html += '   <td class="table-input-td">';
         html += '      <input placeholder="[xlarge, black], [xlarge, red]" item-data="styles" class="table-input" type="text" value="'+styles+'">';
         html += '   </td>';
         html += '   <td btn-action="remove" class="table-padding rm-item-btn">Remove</td>';
         html += '</tr>';
      }
      $('#stock-items-table').find('tbody').html(html);

      $('#stock-items-table').find('[btn-action="remove"]').click(function() {
         chrome.runtime.sendMessage({
            action: 'delete-stock-item',
            index: $(this).closest('tr').attr('item-index')
         }, () => updateStockItems());
      });

      $('#stock-items-table').find('[item-data="keywords"]').change(function() {
         chrome.runtime.sendMessage({
            action: 'set-stock-item-keywords',
            index: $(this).closest('tr').attr('item-index'),
            keywords: $(this).val()
         }, () => updateStockItems());
      });

      $('#stock-items-table').find('[item-data="styles"]').change(function() {
         chrome.runtime.sendMessage({
            action: 'set-stock-item-styles',
            index: $(this).closest('tr').attr('item-index'),
            styles: $(this).val()
         }, () => updateStockItems());
      });

   });
}

function getBinfo() {
   chrome.runtime.sendMessage({action: 'get-binfo'}, function(binfo) {
      if (binfo != undefined)  {
         Object.keys(binfo).forEach(function(key) {
            console.log(key);
            document.getElementById(key).value = binfo[key];
         });
      } else {}
   });
}

function saveBinfo() {
   let binfo = {
      'order[billing_name]': document.getElementById('order[billing_name]').value,
      'order[email]': document.getElementById('order[email]').value,
      'order[tel]': document.getElementById('order[tel]').value,
      'order[billing_address]': document.getElementById('order[billing_address]').value,
      'order[billing_address_2]': document.getElementById('order[billing_address_2]').value,
      'order[billing_address_3]': document.getElementById('order[billing_address_3]').value,
      'order[billing_city]': document.getElementById('order[billing_city]').value,
      'order[billing_zip]': document.getElementById('order[billing_zip]').value,
      'order[billing_country]': document.getElementById('order[billing_country]').value,
      'credit_card[type]': document.getElementById('credit_card[type]').value,
      'credit_card[cnb]': document.getElementById('credit_card[cnb]').value,
      'credit_card[month]': document.getElementById('credit_card[month]').value,
      'credit_card[year]': document.getElementById('credit_card[year]').value,
      'credit_card[vval]': document.getElementById('credit_card[vval]').value
   };
   chrome.runtime.sendMessage({action: 'save-binfo', binfo: binfo});
}

function updateDropDates() {
   chrome.runtime.sendMessage({action: 'get-drop-dates'}, function(data) {

      let html = '<option selected value="">'+data.selected+'</option>';

      Object.keys(data.dates).forEach(key => {
         html += '<option value="'+data.dates[key]+'">'+key+'</option>';
      });

      $('#select-drop-date').html(html);
   });
}

function updateSettings() {
   chrome.runtime.sendMessage({action: 'get-settings'}, function(settings) {
      $('#stock-refresh-rate').val(settings.stockRefreshRate/1000);
      $('#drop-refresh-rate').val(settings.dropRefreshRate/1000);
      $('#add-to-cart-delay').val(settings.addToCartDelay/1000);
      $('#checkout-delay').val(settings.checkoutDelay/1000);
      settings.checkoutInNewTab ? $('#mode-2').attr('checked', true) : $('#mode-1').attr('checked', true);
   });
}

function updateLog() {
   chrome.runtime.sendMessage({action: 'get-log'}, function(log) {
      $('#log-container').html(log);
   })
}

$(document).ready(function() {

   getBinfo();
   updateStockItems();
   updateDropItems();
   updateDropDates();
   updateSettings();
   updateLog();

   $('#save-binfo').click(() => saveBinfo());
   $('#clear-log').click(() => {
      chrome.runtime.sendMessage({action: 'clear-log'});
   });

   $('#add-drop-item').click(function() {
      chrome.runtime.sendMessage({action: 'add-drop-item'}, () => updateDropItems());
   });
   $('#start-drops').click(function() {
      chrome.runtime.sendMessage({action: 'start-drops', epoch: $('#select-drop-date').val()});
   });
   $('#stop-drops').click(function() {
      chrome.runtime.sendMessage({action: 'stop-drops'});
   });

   $('#add-stock-item').click(function() {
      chrome.runtime.sendMessage({action: 'add-stock-item'}, () => updateStockItems())
   });
   $('#start-stocks').click(function() {
      chrome.runtime.sendMessage({action: 'start-stocks'});
   });
   $('#stop-stocks').click(function() {
      chrome.runtime.sendMessage({action: 'stop-stocks'});
   });

   $('#save-settings').click(function() {
      chrome.runtime.sendMessage({
         action: 'set-settings',
         stockRefreshRate: $('#stock-refresh-rate').val()*1000,
         dropRefreshRate: $('#drop-refresh-rate').val()*1000,
         addToCartDelay: $('#add-to-cart-delay').val()*1000,
         checkoutDelay: $('#checkout-delay').val()*1000,
         checkoutInNewTab: $('#mode-2').is(':checked')
      }, () => updateSettings());
   });

});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
   if (request.action === 'log') {
      $('#log-container').html(request.logText);
   }
});
