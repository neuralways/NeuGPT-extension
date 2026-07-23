// Content script to scrape LinkedIn posts for NeuGPT

let isScraping = false;
let scrollInterval = null;
let scrollSpeed = 5;
let collectedPosts = [];
let collectedPostIds = new Set();

function extractPostData(postElement, urn) {
    try {
        // 1. Author
        let author = "Unknown";
        const actorImage = postElement.querySelector('a[data-view-name="feed-actor-image"] figure, [data-view-name="feed-actor-image"], figure[aria-label*="profile"], img[alt*="profile"]');
        const authorElement = postElement.querySelector('.update-components-actor__name, .update-components-actor__title, .feed-shared-actor__name');

        if (authorElement) {
            author = (authorElement.innerText || authorElement.textContent).trim() || author;
        } else if (actorImage && actorImage.getAttribute('aria-label')) {
            author = actorImage.getAttribute('aria-label');
        } else if (actorImage && actorImage.getAttribute('alt')) {
            author = actorImage.getAttribute('alt');
        } else {
            // Attempt to find any anchor link that points to a profile, containing the author name
            const profileLinks = postElement.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
            for (let link of profileLinks) {
                let text = (link.innerText || link.textContent || "").trim();
                // ignore just "view profile" strings or empty
                if (text && text.length > 2 && !text.toLowerCase().includes("view") && !text.includes("<img")) {
                    author = text;
                    break;
                }
            }
            if (author === "Unknown") {
                const appAwareLink = postElement.querySelector('a.app-aware-link[aria-label]');
                if (appAwareLink) author = appAwareLink.getAttribute('aria-label').trim();
            }
        }
        author = author.replace(/^View\s+/, '').replace(/’s profile/g, '').replace(/'s profile/g, '').replace(/,.*$/, '').trim();
        author = author.split('\n')[0].trim();
        author = author.split('•')[0].replace(/2nd/, '').replace(/3rd/, '').replace(/1st/, '').trim();

        // 2. Post Text
        let postText = "";
        const textElement = postElement.querySelector(
            '.update-components-text, ' +
            '.feed-shared-update-v2__description, ' +
            '[data-view-name="feed-commentary"], ' +
            '[data-testid="expandable-text-box"], ' +
            '.feed-shared-update-v2__commentary, ' +
            '.update-components-update-v2__commentary'
        );
        if (textElement) {
            postText = (textElement.innerText || textElement.textContent || "").trim();
        }

        // 3. Link
        let postLink = `https://www.linkedin.com/feed/update/${urn}`;
        if (!urn || urn.startsWith("hash_")) {
            postLink = "N/A";
        }

        // 4. Date
        let dateTime = "Unknown";
        const timeElement = postElement.querySelector('a.app-aware-link > time, span.update-components-actor__sub-description, .feed-shared-actor__sub-description');
        if (timeElement) {
            dateTime = timeElement.textContent.trim().split('•')[0].trim();
        } else {
            const globes = postElement.querySelectorAll('svg[id^="globe-"], svg[id^="people-"]');
            for (let svg of globes) {
                const p = svg.closest('p');
                if (p) {
                    const textContent = p.textContent.trim();
                    if (textContent.includes('•')) {
                        dateTime = textContent.split('•')[0].trim();
                        break;
                    }
                }
            }
        }
        dateTime = dateTime.split('\n')[0].trim();

        // 5. Company (Tagline)
        let company = "";
        const companyElement = postElement.querySelector('.update-components-actor__description, .feed-shared-actor__description');
        if (companyElement) {
            company = companyElement.textContent.trim();
        } else {
            const actorLink = postElement.querySelector('a[data-view-name="feed-actor-image"]');
            if (actorLink && actorLink.nextElementSibling) {
                const ps = actorLink.nextElementSibling.querySelectorAll('p');
                if (ps.length >= 2) company = ps[1].textContent.trim();
            } else {
                const globes = postElement.querySelectorAll('svg[id^="globe-"], svg[id^="people-"]');
                for (let svg of globes) {
                    const pDate = svg.closest('p');
                    if (pDate && pDate.closest('a')) {
                        const allPs = pDate.closest('a').querySelectorAll('p');
                        for (let i = 0; i < allPs.length; i++) {
                            if (allPs[i] === pDate && i > 0) company = allPs[i - 1].textContent.trim();
                        }
                    } else if (pDate && pDate.parentElement) {
                        const allPs = pDate.parentElement.parentElement.querySelectorAll('p');
                        for (let i = 0; i < allPs.length; i++) {
                            if (allPs[i] === pDate && i > 0) company = allPs[i - 1].textContent.trim();
                        }
                    }
                }
            }
        }
        if (company) company = company.split('\n')[0].trim();

        // 6. Email
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const emails = postText.match(emailRegex);
        const postEmail = emails ? emails.join(', ') : "N/A";

        if (author === "Unknown" || !postText) {
            return null;
        }

        return {
            author,
            postText,
            postLink,
            postEmail,
            dateTime,
            company
        };

    } catch (err) {
        console.error("Error parsing post:", err);
        return null;
    }
}

function scrapeVisiblePosts() {
    const postElements = document.querySelectorAll(
        'div[data-urn*="activity"], ' +
        'div[data-view-name="feed-full-update"], ' +
        'div.feed-shared-update-v2, ' +
        'div.occludable-update, ' +
        'div.update-components-update-v2, ' +
        'div[role="listitem"]'
    );

    postElements.forEach(post => {
        let urn = post.getAttribute('data-urn');
        if (!urn) {
            const p = post.closest('[data-view-tracking-scope]');
            if (p) {
                const match = p.getAttribute('data-view-tracking-scope').match(/urn:li:activity:\d+/);
                if (match) urn = match[0];
            }
        }
        if (!urn) {
            const match = post.innerHTML.match(/urn:li:activity:\d+/);
            if (match) urn = match[0];
        }
        if (!urn) {
            const textContent = post.innerText || post.textContent || "";
            const snip = textContent.substring(0, 60).trim();
            if (!snip) return;
            let hash = 0;
            for (let i = 0; i < snip.length; i++) hash = ((hash << 5) - hash) + snip.charCodeAt(i);
            urn = "hash_" + hash;
        }

        if (collectedPostIds.has(urn)) return;

        const postData = extractPostData(post, urn);

        if (postData) {
            if (postData.postEmail === "N/A" || !postData.postEmail) {
                return;
            }

            collectedPostIds.add(urn);
            collectedPosts.push({
                Author: postData.author,
                "Post Text": postData.postText,
                "Post Link": postData.postLink,
                Email: postData.postEmail,
                Date: postData.dateTime,
                Company: postData.company,
                Role: "" 
            });

            chrome.runtime.sendMessage({
                action: 'updateCount',
                count: collectedPosts.length
            }).catch(() => {});
        }
    });
}

function startScrolling() {
    if (scrollInterval) clearInterval(scrollInterval);

    const step = scrollSpeed * 2;
    const interval = 50;

    scrollInterval = setInterval(() => {
        window.scrollBy(0, step);
        const scrollContainers = document.querySelectorAll('.scaffold-layout__main, #scaffold-layout-container, main, #workspace, .application-outlet');
        scrollContainers.forEach(container => {
            if (container && container.scrollHeight > container.clientHeight) {
                container.scrollBy(0, step);
            }
        });
        scrapeVisiblePosts();
    }, interval);
}

function startScraping() {
    isScraping = true;
    startScrolling();
}

function stopScraping() {
    isScraping = false;
    if (scrollInterval) clearInterval(scrollInterval);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScraping') {
        if (!isScraping) {
            if (request.hasOwnProperty('speed')) {
                scrollSpeed = parseInt(request.speed);
            }
            startScraping();
        }
        sendResponse({ success: true });
    } else if (request.action === 'stopScraping') {
        stopScraping();
        sendResponse({ success: true });
    } else if (request.action === 'getScrapedData') {
        sendResponse({ success: true, data: collectedPosts });
    } else if (request.action === 'resetData') {
        collectedPosts = [];
        collectedPostIds.clear();
        sendResponse({ success: true });
    } else if (request.action === 'SCRAPE_LINKEDIN_POSTS') {
        // Fallback for single-scrape request if needed
        scrapeVisiblePosts();
        sendResponse({ success: true, data: collectedPosts });
    }
    return true;
});

