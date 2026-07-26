// Content script to scrape LinkedIn posts for NeuGPT

let isScraping = false;
let scrollInterval = null;
let domObserver = null;
let scrollSpeed = 5;
let collectedPosts = [];
let collectedPostIds = new Set();

// ─── URN extraction ──────────────────────────────────────────────────────────

function extractUrn(postElement) {
    // 1. data-urn attribute (most reliable)
    let urn = postElement.getAttribute('data-urn');
    if (urn && urn.includes('activity')) return urn;

    // 2. Closest ancestor with tracking scope
    const scoped = postElement.closest('[data-view-tracking-scope]');
    if (scoped) {
        const match = scoped.getAttribute('data-view-tracking-scope').match(/urn:li:activity:\d+/);
        if (match) return match[0];
    }

    // 3. Scan innerHTML for activity URN
    const htmlMatch = postElement.innerHTML.match(/urn:li:activity:\d+/);
    if (htmlMatch) return htmlMatch[0];

    // 4. Stable hash fallback from post text (to avoid dupes from missing URNs)
    const snip = (postElement.textContent || '').substring(0, 80).trim();
    if (!snip) return null;
    let hash = 0;
    for (let i = 0; i < snip.length; i++) hash = ((hash << 5) - hash) + snip.charCodeAt(i);
    return 'hash_' + (hash >>> 0); // unsigned 32-bit
}

// ─── Expand "See more" buttons to get full text ───────────────────────────────

function expandSeeMoreButtons(postElement) {
    // Find and click all "See more" buttons within this post
    const seeMoreButtons = postElement.querySelectorAll(
        'button[aria-label*="See more"], ' +
        'button[aria-label*="see more"], ' +
        'span[aria-label*="展开更多"], ' +
        '.see-more button, ' +
        '[data-test-id="expandable-text-box"] button, ' +
        '.feed-shared-text-view button, ' +
        '.update-components-text-view button'
    );
    
    seeMoreButtons.forEach(button => {
        try {
            // Scroll the button into view first
            button.scrollIntoView({ behavior: 'instant', block: 'center' });
            // Small delay to ensure DOM is ready
            const rect = button.getBoundingClientRect();
            if (rect.height > 0 && rect.width > 0) {
                button.click();
            }
        } catch (e) {
            // Button might not be clickable, try clicking anyway
            try { button.click(); } catch (e2) { /* ignore */ }
        }
    });
    
    // Also check for "See more" text in button content
    const allButtons = postElement.querySelectorAll('button');
    allButtons.forEach(button => {
        const text = (button.textContent || '').toLowerCase();
        if (text.includes('see more') || text.includes('...see more') || text.includes('see more...')) {
            try {
                button.scrollIntoView({ behavior: 'instant', block: 'center' });
                button.click();
            } catch (e) { /* ignore */ }
        }
    });
}

// ─── Post data extraction ────────────────────────────────────────────────────

function extractPostData(postElement, urn) {
    try {
        // 1. Author
        let author = 'Unknown';
        const authorEl = postElement.querySelector(
            '.update-components-actor__name, .update-components-actor__title, .feed-shared-actor__name'
        );
        const actorFig = postElement.querySelector(
            'a[data-view-name="feed-actor-image"] figure, [data-view-name="feed-actor-image"], figure[aria-label*="profile"], img[alt*="profile"]'
        );

        if (authorEl) {
            author = (authorEl.innerText || authorEl.textContent || '').trim() || author;
        } else if (actorFig && actorFig.getAttribute('aria-label')) {
            author = actorFig.getAttribute('aria-label');
        } else if (actorFig && actorFig.getAttribute('alt')) {
            author = actorFig.getAttribute('alt');
        } else {
            for (const link of postElement.querySelectorAll('a[href*="/in/"], a[href*="/company/"]')) {
                const text = (link.innerText || link.textContent || '').trim();
                if (text && text.length > 2 && !text.toLowerCase().includes('view') && !text.includes('<img')) {
                    author = text;
                    break;
                }
            }
            if (author === 'Unknown') {
                const appLink = postElement.querySelector('a.app-aware-link[aria-label]');
                if (appLink) author = appLink.getAttribute('aria-label').trim();
            }
        }
        author = author
            .replace(/^View\s+/, '')
            .replace(/'s profile/g, '')
            .replace(/,.*$/, '')
            .split('\n')[0]
            .split('•')[0]
            .replace(/\b(1st|2nd|3rd)\b/g, '')
            .trim();

        // 2. Post Text — FIRST expand "See more" buttons to get full text
        let postText = '';
        
        // Expand any collapsed text first
        expandSeeMoreButtons(postElement);
        
        // Small delay to allow DOM to update after clicking "See more" buttons
        // This is critical - without this delay, textContent might still get truncated text
        const startTime = Date.now();
        const maxWait = 200; // Wait up to 200ms for text to expand
        
        // Poll for expanded text
        while (Date.now() - startTime < maxWait) {
            const textEl = postElement.querySelector(
                '.update-components-text, ' +
                '.feed-shared-update-v2__description, ' +
                '[data-view-name="feed-commentary"], ' +
                '[data-testid="expandable-text-box"], ' +
                '.feed-shared-update-v2__commentary, ' +
                '.update-components-update-v2__commentary'
            );
            if (textEl) {
                const currentText = (textEl.textContent || textEl.innerText || '').trim();
                // If we have text, use it
                if (currentText) {
                    postText = currentText;
                    break;
                }
            }
            // If no text yet, wait a bit and try again
            if (!postText) {
                // Use a simple spin wait (this is a content script, performance is important)
                const waitUntil = Date.now() + 20;
                while (Date.now() < waitUntil) { /* spin */ }
            }
        }
        
        // Fallback: if still no text, try getting text from the entire post element
        if (!postText) {
            postText = (postElement.textContent || '').trim();
            // Remove common UI elements from the text
            postText = postText
                .replace(/See more/gi, '')
                .replace(/Show more/gi, '')
                .replace(/Click to see more/gi, '')
                .trim();
        }

        // 3. Email — scan full text (incl. hidden content)
        const emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
        const emails = postText.match(emailRegex);
        const postEmail = emails ? [...new Set(emails)].join(', ') : 'N/A';

        // Only keep posts that have a valid email
        if (postEmail === 'N/A') return null;

        // Also skip if we couldn't identify author or text
        if (author === 'Unknown' || !postText) return null;

        // 4. Post link
        const postLink = (urn && !urn.startsWith('hash_'))
            ? `https://www.linkedin.com/feed/update/${urn}`
            : 'N/A';

        // 5. Date
        let dateTime = 'Unknown';
        const timeEl = postElement.querySelector(
            'a.app-aware-link > time, span.update-components-actor__sub-description, .feed-shared-actor__sub-description'
        );
        if (timeEl) {
            dateTime = timeEl.textContent.trim().split('•')[0].trim();
        } else {
            for (const svg of postElement.querySelectorAll('svg[id^="globe-"], svg[id^="people-"]')) {
                const p = svg.closest('p');
                if (p && p.textContent.includes('•')) {
                    dateTime = p.textContent.split('•')[0].trim();
                    break;
                }
            }
        }
        dateTime = dateTime.split('\n')[0].trim();

        // 6. Company / tagline
        let company = '';
        const companyEl = postElement.querySelector(
            '.update-components-actor__description, .feed-shared-actor__description'
        );
        if (companyEl) {
            company = companyEl.textContent.trim();
        } else {
            const actorLink = postElement.querySelector('a[data-view-name="feed-actor-image"]');
            if (actorLink && actorLink.nextElementSibling) {
                const ps = actorLink.nextElementSibling.querySelectorAll('p');
                if (ps.length >= 2) company = ps[1].textContent.trim();
            }
        }
        if (company) company = company.split('\n')[0].trim();

        return { author, postText, postLink, postEmail, dateTime, company };

    } catch (err) {
        console.error('[NeuGPT] Error parsing post:', err);
        return null;
    }
}

// ─── Scraping core ───────────────────────────────────────────────────────────

function tryAddPost(postElement) {
    const urn = extractUrn(postElement);
    if (!urn) return;
    if (collectedPostIds.has(urn)) return;

    const postData = extractPostData(postElement, urn);
    if (!postData) return;

    // Mark as collected BEFORE pushing so concurrent calls don't double-add
    collectedPostIds.add(urn);
    collectedPosts.push({
        Author: postData.author,
        'Post Text': postData.postText,
        'Post Link': postData.postLink,
        Email: postData.postEmail,
        Date: postData.dateTime,
        Company: postData.company,
        Role: '',
    });

    chrome.runtime.sendMessage({
        action: 'updateCount',
        count: collectedPosts.length,
    }).catch(() => {});
}

const POST_SELECTORS = [
    'div[data-urn*="activity"]',
    'div[data-view-name="feed-full-update"]',
    'div.feed-shared-update-v2',
    'div.occludable-update',
    'div.update-components-update-v2',
    'div[role="listitem"]',
].join(', ');

function scrapeVisiblePosts() {
    document.querySelectorAll(POST_SELECTORS).forEach(tryAddPost);
}

// ─── MutationObserver — catches posts the instant LinkedIn adds them ──────────

function startObserver() {
    if (domObserver) return;

    // Watch the broadest container we can so we catch every LinkedIn DOM addition
    const root = document.querySelector(
        '.scaffold-layout__main, #scaffold-layout-container, main, #main'
    ) || document.body;

    domObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue; // elements only

                // Check if this node itself is a post
                if (node.matches && node.matches(POST_SELECTORS)) {
                    tryAddPost(node);
                }

                // Check descendants (LinkedIn wraps posts in several layers)
                if (node.querySelectorAll) {
                    node.querySelectorAll(POST_SELECTORS).forEach(tryAddPost);
                }
            }
        }
    });

    domObserver.observe(root, { childList: true, subtree: true });
}

function stopObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
    }
}

// ─── Scroll engine ───────────────────────────────────────────────────────────

function startScrolling() {
    if (scrollInterval) clearInterval(scrollInterval);

    const step = scrollSpeed * 2;

    scrollInterval = setInterval(() => {
        // Scrape BEFORE scrolling so we don't miss posts that scroll out of view
        scrapeVisiblePosts();

        window.scrollBy(0, step);
        document.querySelectorAll(
            '.scaffold-layout__main, #scaffold-layout-container, main, #workspace, .application-outlet'
        ).forEach(container => {
            if (container.scrollHeight > container.clientHeight) {
                container.scrollBy(0, step);
            }
        });
    }, 50);
}

// ─── Start / Stop ────────────────────────────────────────────────────────────

function startScraping() {
    isScraping = true;
    // Capture whatever is already on screen
    scrapeVisiblePosts();
    // Watch for new posts added dynamically (main fix for virtualised lists)
    startObserver();
    // Also scroll + poll as a backup
    startScrolling();
}

function stopScraping() {
    isScraping = false;
    stopObserver();
    if (scrollInterval) clearInterval(scrollInterval);
    scrollInterval = null;
    // Final sweep to catch anything in the current viewport
    scrapeVisiblePosts();
}

function resetScrapeState() {
    isScraping = false;
    stopObserver();
    if (scrollInterval) clearInterval(scrollInterval);
    scrollInterval = null;
    collectedPosts = [];
    collectedPostIds.clear();
}

// ─── Message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScraping') {
        if (!isScraping) {
            if (request.hasOwnProperty('speed')) {
                scrollSpeed = parseInt(request.speed) || 5;
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
        resetScrapeState();
        sendResponse({ success: true });

    } else if (request.action === 'SCRAPE_LINKEDIN_POSTS') {
        scrapeVisiblePosts();
        sendResponse({ success: true, data: collectedPosts });
    }

    return true; // keep message channel open for async responses
});
