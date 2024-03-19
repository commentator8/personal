// ==UserScript==
// @name         Remove Pinned Workplace Group Posts
// @namespace    http://tampermonkey.net/
// @version      2024-03-19
// @description  Remove pinned posts at the top of workplace groups
// @author       You
// @match        https://*.workplace.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none

// ==/UserScript==

(function() {
    'use strict';

    // can be extended to 
        // cope with the mobile site m.*.workplace.com
        // replace with a button to show/hide

    function findTopmostParentDivOfPinnedPost() {
        var xpathExpression = "//*[contains(text(), 'Pinned post')]";
        // Use document.evaluate to find the first matching element
        var result = document.evaluate(xpathExpression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        // Get the first matching element
        var element = result.singleNodeValue;

        function findTopmostParentDiv(element) {
            var attempts = 20;
            while (element && attempts > 0) {
                var parentDiv = element.parentElement.closest('div');
                if (parentDiv) {
                    var grandparentDiv = parentDiv.parentElement;
                    if (grandparentDiv && grandparentDiv.tagName === 'DIV' && !grandparentDiv.className && !grandparentDiv.hasAttribute('style')) {
                        return parentDiv;
                    }
                }
                element = parentDiv;
                attempts = attempts - 1;
            }
            return parentDiv;
        }

        // If an element was found, find its topmost parent div
        if (element) {
            var topmostParentDiv = findTopmostParentDiv(element);
            if (topmostParentDiv) {
                return topmostParentDiv;
            }
        }
        // If no topmost parent div was found, return null
        return null;
    }
    // Call the function and log the result to the console
    // console.log(findTopmostParentDivOfPinnedPost());

    // Create a mutation observer to watch for changes in the document
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // If nodes were added or removed
            if (mutation.type === 'childList') {
                var elems1 = findTopmostParentDivOfPinnedPost();
                // If the element was found, remove it
                if (elems1) {
                    elems1.parentNode.removeChild(elems1);
                }
            }
        });
    });
    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });

})();

