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

// can be extended to
//     cope with the mobile site m.*.workplace.com

var debug = false;
var defaultOpen = true;
let isLocked = false;


function checkDarkMode() {
    var htmlClassList = document.documentElement.classList;
    for (var i = 0; i < htmlClassList.length; i++) {
        if (htmlClassList[i].indexOf("dark-mode") !== -1) {
            return true;
        }
    }
    return false;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}
function isMoreThanThreeCharsDiff(a, b) {
  return levenshteinDistance(a, b) >= 3;
}

function getGroupName() {
    var xpathExpression = "//a[substring(@href, string-length(@href)-14) = '/announcements/']";
    var result = document.evaluate(xpathExpression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var group_announcement_link = result.singleNodeValue.href;
    const pattern = /groups\/(.*?)\/announcements/;
    var groupName = group_announcement_link.match(pattern)[1];
    return groupName;
}

function getFirstHeader(node) {
    let firstHeader = null;
    const headers = ['h4', 'h5', 'h6'];

    function findHeader(node) {
        if (headers.includes(node.tagName.toLowerCase())) {
            firstHeader = node;
            return true;
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];

            if (child.nodeType === Node.ELEMENT_NODE && findHeader(child)) {
                return true;
            }
        }

        return false;
    }

    findHeader(node);
    return firstHeader;
}

function findLowestAutoDirDiv(node) {
    let lowestDiv = null;

    function findDiv(node) {
        if (node.tagName === 'DIV' && node.getAttribute('dir') === 'auto') {
            lowestDiv = node;
            return true;
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];

            if (child.nodeType === Node.ELEMENT_NODE && findDiv(child)) {
                return true;
            }
        }

        return false;
    }

    findDiv(node);
    return lowestDiv;
}

function findTopmostParentDivOfPinnedPost() {
    var path = "/" + getGroupName() + "/announcements/"
    var xpathExpression = `//a[contains(@href, '${path}') and not(ancestor::div[@role='gridcell'])]`;
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
    var groupName = getGroupName();

    if (elems1) {
        var prevParent = elems1.parentNode;

        if (!elems1.hasAttribute("data-pinned")) {
            // elems1.setAttribute("data-pinned", true);
            if (isLocked) {
                if (debug) console.log("Locked - leaving");
                return;
            }
            try {
                // Acquire the lock
                isLocked = true;
                if (debug) console.log(elems1);
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
                let elems1Content = getFirstHeader(elems1);
                var postText = "";
                if (elems1Content) {
                    postText = elems1Content.parentElement.textContent;
                } else {
                    postText = findLowestAutoDirDiv(elems1).textContent;
                }

                if (debug) console.log("postText ", postText);

                details.addEventListener("click", async function() {
                    var values = [!details.open, postText];
                    await GM.setValue(groupName, values.join(" |||| "));
                    if (debug) console.log("Toggling GM.setValue to ", values);
                });
                var currStoredValue = await GM.getValue(groupName, String(defaultOpen) + " |||| ");
                if (debug) console.log("Current GM.getValue is ", currStoredValue);

                var [isOpen, oldContent] = String(currStoredValue).split(" |||| ");
                isOpen = (isOpen === 'true');

                if (oldContent == null) {
                    if (debug) console.log("Old content was null");
                    isOpen = false;
                    oldContent = postText;
                }

                if (isOpen) {
                    if (debug) console.log("Setting open as received isOpen: ", isOpen);
                    details.open = true;
                }
                if (isMoreThanThreeCharsDiff(oldContent, postText)) {
                    if (debug) console.log("Setting open as received oldContent: ", oldContent);
                    if (debug) console.log("Setting open as received newContent: ", postText);
                    details.open = true;
                }
                if (debug) console.log("Adding to details");
                details.appendChild(summary);
                details.appendChild(elems1);
                prevParent.insertBefore(details, prevParent.firstChild);
                if (debug) console.log("Added to details");
            }
            catch (error) {
                console.log("Error: ", error);
            }

            isLocked = false;
        }
    }
}

(async() => {
    'use strict';

    // Create a mutation observer to watch for changes in the document
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // If nodes were added or removed
            // console.log(mutation, mutation.addedNodes, mutation.attributeName);
            if (mutation.type === 'childList') {
                moveToDetailsTag();
            }
        });
    });
    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });
    //moveToDetailsTag();

})();
