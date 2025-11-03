(function ($) {
	'use strict'

	function setCookie(name, value, days) {
		var expires = "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=/";

		// Call removeBlockedElements after setting the cookie
		if (name === "thimcookie-consent") {
			removeBlockedElements();
		}
	}

	function getCookie(name) {
		const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
		if (match) {
			try {
				return JSON.parse(decodeURIComponent(match[2]));
			} catch (e) {
				return null;
			}
		}
		return null;
	}

	function clearCookie(name, path = "/") {
		const hostname = window.location.hostname;

		// clear the cookie for the current domain
		document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=" + path + "; domain=" + hostname + ";";

		// clear the cookie for the domain with a leading dot
		const domainWithDot = "." + hostname.replace(/^www\./, ""); // Add leading dot and remove "www" if present
		document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=" + path + "; domain=" + domainWithDot + ";";
	}

	function removeBlockedElements() {
		const consent = getCookie("thimcookie-consent");
		if (!consent) return;

		// Fetch cookie list data from the server (via AJAX or inline script)
		const cookieList = window.thimCookieCfg.cookie_list || {};

		// Iterate over the keys of the cookieList object
		Object.keys(cookieList).forEach(function (category) {
			const cookies = cookieList[category];

			// Check if the consent for this category is "no"
			if (consent[category] === "no" && Array.isArray(cookies)) {
				cookies.forEach(function (cookie) {
					const srcPattern = cookie.src;

					// Clear the cookie by name ( id )
					if (cookie.id) {
						clearCookie(cookie.id);
					}

					// Remove scripts matching the pattern
					document.querySelectorAll('script').forEach(function (script) {
						const src = script.src || script.getAttribute('src');
						if (src && src.includes(srcPattern)) {
							script.remove(); // Remove blocked scripts
						}
					});
				});
			}
		});

		// Block dynamically added scripts
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeName.toLowerCase() === "script") {
						const src = node.src || node.getAttribute('src');

						// Check if the script URL matches any pattern in cookieList
						Object.keys(cookieList).forEach(function (category) {
							const cookies = cookieList[category];
							if (consent[category] === "no" && Array.isArray(cookies)) {
								cookies.forEach(function (cookie) {
									const srcPattern = cookie.src;
									if (src && src.includes(srcPattern)) {
										node.remove(); // Remove blocked scripts
									}
								});
							}
						});
					}
				});
			});
		});

		observer.observe(document.body, {childList: true, subtree: true});
	}

	$(document).ready(function () {
		// Run removeBlockedElements on page load
		removeBlockedElements();

		// cookie consent control
		const consent = getCookie("thimcookie-consent");
		if (consent) {
			document.querySelectorAll('[type="text/plain"][data-thimcookie-category]').forEach(function (el) {
				const cat = el.getAttribute('data-thimcookie-category');
				if (consent[cat] === "yes") {
					const s = document.createElement('script');
					if (el.src) {
						s.src = el.src;
					} else {
						s.textContent = el.textContent;
					}
					document.body.appendChild(s);
				}
			});
		}

		// control banner
		let ck_endpoint = thimCookieCfg.endpoint;

		if (document.cookie.includes('thimcookie-consent=')) {
			if (ck_endpoint.includes('?')) {
				ck_endpoint += '&stage=revisit';
			} else {
				ck_endpoint += '?stage=revisit';
			}
		}

		$.get(ck_endpoint, function (html) {
			if (!html) return;

			// append banner
			$('body').append(html);

			// on click events
			window.thimCustomise = function () {
				var customiseModal = $('#thimcookie-customise');
				var mdoverlay = $('.md-overlay');
				var banner = $('#thimcookie-banner');

				if (customiseModal.length) {
					// Show the customise modal
					customiseModal.removeClass('thim-hide');
					mdoverlay.removeClass('thim-hide');

					// Hide the cookie banner if it is visible
					if (banner.length && !banner.hasClass('thim-hide')) {
						banner.addClass('thim-hide');
					}
				}
			};

			window.thimCloseModal = function () {
				var customiseModal = $('#thimcookie-customise');
				var mdoverlay = $('.md-overlay');
				var banner = $('#thimcookie-banner');

				if (customiseModal.length) {
					// Hide the customise modal
					customiseModal.addClass('thim-hide');
					mdoverlay.addClass('thim-hide');

					// Show the cookie banner if it is not visible
					if (banner.length && banner.hasClass('thim-hide')) {
						banner.removeClass('thim-hide');
					}
				}
			};

			window.thimCookieAcceptAll = function () {
				const consent = {
					necessary : "yes",
					analytics : "yes",
					ads       : "yes",
					functional: "yes"
				};

				setCookie("thimcookie-consent", consent, 365);
				location.reload();
			};

			window.thimCookieRejectAll = function () {
				const consent = {
					necessary : "yes", // Necessary cookies cannot be rejected
					analytics : "no",
					ads       : "no",
					functional: "no"
				};

				setCookie("thimcookie-consent", consent, 365);
				location.reload();
			};

			window.saveThimConsent = function () {
				var checkbox_analytics = document.getElementById('consent-analytics');
				var checkbox_ads = document.getElementById('consent-ads');
				var checkbox_functional = document.getElementById('consent-functional');
				const consent = {
					necessary : "yes",
					analytics : (checkbox_analytics && checkbox_analytics.checked) ? "yes" : "no",
					ads       : (checkbox_ads && checkbox_ads.checked) ? "yes" : "no",
					functional: (checkbox_functional && checkbox_functional.checked) ? "yes" : "no"
				};
				setCookie("thimcookie-consent", consent, 365);
				location.reload();
			};

			// Prevent checkbox click from toggling the parent .thimcookie-cat
			$('#thimcookie-customise .thimcookie-cat input[type="checkbox"]').on('click', function (e) {
				e.stopPropagation();
			});

			// Toggle functionality for .thimcookie-cat
			$('#thimcookie-customise .thimcookie-cat').on('click', function () {
				const toggleIcon = $(this).find('.icon-toggle');

				// Toggle the 'toggled' class
				$(this).toggleClass('toggled');

				// Update the text content of .icon-toggle
				if ($(this).hasClass('toggled')) {
					toggleIcon.text('-');
				} else {
					toggleIcon.text('+');
				}
			});
		});

	});
})(jQuery);
