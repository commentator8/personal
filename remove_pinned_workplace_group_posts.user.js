// ==UserScript==
// @name         Remove Pinned Workplace Group Posts
// @namespace    http://tampermonkey.net/
// @version      2024-03-19
// @description  Remove pinned posts at the top of workplace groups
// @author       You
// @match        https://*.workplace.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant GM.setValue
// @grant GM.getValue

// ==/UserScript==

function checkDarkMode() {
    var htmlClassList = document.documentElement.classList;
    for (var i = 0; i < htmlClassList.length; i++) {
        if (htmlClassList[i].indexOf("dark-mode") !== -1) {
            return true;
        }
    }
    return false;
}

// can be extended to
// cope with the mobile site m.*.workplace.com
// replace with a button to show/hide

function findTopmostParentDivOfPinnedPost() {
    var xpathExpression = "//a[contains(@href, '/announcements/') and not(ancestor::div[@role='gridcell'])]";
    // Use document.evaluate to find the first matching element
    var result = document.evaluate(xpathExpression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    // Get the first matching element
    var element = result.singleNodeValue;

    function findTopmostParentDiv(element) {
        var attempts = 20;
        while (element && attempts > 0) {
            if (element.parentElement.closest('details')) {
                return null;
            }
            var parentDiv = element.parentElement.closest('div');
            if (parentDiv) {
                var grandparentDiv = parentDiv.parentElement;
                if (grandparentDiv && grandparentDiv.tagName === 'DIV' && !grandparentDiv.className && !grandparentDiv.hasAttribute('style')) {
                    if (parentDiv.children.length === 1 && parentDiv.children[0].tagName === 'DIV') {
                        return parentDiv;
                    }
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

async function moveToDetailsTag(){
    var elems1 = findTopmostParentDivOfPinnedPost();
    var groupName = document.title.split('|')[0].toLowerCase().replace(/ /g, '_');

    if (elems1) {
        var prevParent = elems1.parentNode;

        if (!elems1.hasAttribute("data-pinned")) {
            elems1.setAttribute("data-pinned", true);
            // console.log(elems1);
            var details = document.createElement("details");
            var summary = document.createElement("summary");
            summary.innerText = "Toggle Pinned Posts";
            if (checkDarkMode()) {
                summary.style.backgroundColor = "#333";
                summary.style.color = "white";
            } else {
                summary.style.backgroundColor = "#fff";
                summary.style.color = "black";
            }
            summary.style.padding = "5px";
            summary.style.marginBottom = "10px";

            // var elems1Text = elems1.textContent.replace(/[\n]/g, "\\n").split("LikeComment")[0];
            let h4 = elems1.querySelector("h4");
            let h4Parent = h4.parentElement;
            let elems1Text = h4Parent.textContent;

            details.addEventListener("click", async function() {
                var values = [!details.open, elems1Text];
                await GM.setValue(groupName, values.join(" |||| "));
                // console.log("Toggling GM.setValue to ", values);
            });
            var currStoredValue = await GM.getValue(groupName, "true |||| ");
            // console.log("Current GM.getValue is ", currStoredValue);

            var [isOpen, oldContent] = String(currStoredValue).split(" |||| ");
            isOpen = (isOpen === 'true');

            if (oldContent == null) {
                // console.log("Old content was null");
                isOpen = false;
                oldContent = elems1Text;
            }

            if (isOpen) {
                // console.log("Setting open as received isOpen: ", isOpen);
                details.open = true;
            }
            if (oldContent !== elems1Text) {
                // console.log("Setting open as received oldContent: ", oldContent);
                // console.log("Setting open as received newContent: ", elems1Text);
                details.open = true;
            }

            details.appendChild(summary);
            details.appendChild(elems1);
            prevParent.insertBefore(details, prevParent.firstChild);
        }
    }
}

(async() => {
    'use strict';

    // Create a mutation observer to watch for changes in the document
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // If nodes were added or removed
            if (mutation.type === 'childList') {
                moveToDetailsTag();
            }
        });
    });
    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });
    // moveToDetailsTag();

})();

