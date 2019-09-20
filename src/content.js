if (window.location.href === 'https://www.supremenewyork.com/checkout') {
   chrome.runtime.sendMessage({action: 'fill-form-in'});
} else {}
