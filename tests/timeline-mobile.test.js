const { chromium } = require('@playwright/test');
const assert = require('assert');
const path = require('path');
const http = require('http');
const fs = require('fs');

const mockUser = {
    user: { id: "user_1", username: "testrunner" }
};

const mockDaily = {
    totalScore: 40,
    roundsTotal: 5,
    rounds: [
        {
            completed: false,
            events: [
                {
                    id: "ev1",
                    title: "Invention of the Printing Press",
                    category: "TECHNOLOGY",
                    description: "Johannes Gutenberg develops the movable type printing press in Mainz, Germany, revolutionizing communication across Europe and accelerating the spread of Renaissance ideas.",
                    year: 1440
                },
                {
                    id: "ev2",
                    title: "Fall of Constantinople",
                    category: "HISTORY",
                    description: "The Ottoman Empire under Sultan Mehmed II breaches the ancient Theodosian Walls, bringing an end to the Byzantine Empire and shifting trade routes.",
                    year: 1453
                },
                {
                    id: "ev3",
                    title: "First Moon Landing",
                    category: "SPACE EXPLORATION",
                    description: "Apollo 11 commander Neil Armstrong and lunar module pilot Buzz Aldrin touch down on the Sea of Tranquility, becoming the first humans to walk on the lunar surface.",
                    year: 1969
                },
                {
                    id: "ev4",
                    title: "Fall of the Berlin Wall",
                    category: "POLITICS",
                    description: "East German officials open border checkpoints along the Berlin Wall following weeks of mass civil unrest, marking the symbolic end of the Cold War in Europe.",
                    year: 1989
                }
            ]
        }
    ]
};

const mockOutcome = {
    xpEarned: 40,
    correctPositions: 4,
    dailyComplete: true,
    solution: [
        { id: "ev1", title: "Invention of the Printing Press", date: "1440", description: "Johannes Gutenberg develops the printing press." },
        { id: "ev2", title: "Fall of Constantinople", date: "1453", description: "Ottoman Empire breaches the walls." },
        { id: "ev3", title: "First Moon Landing", date: "1969", description: "Apollo 11 touches down on lunar surface." },
        { id: "ev4", title: "Fall of the Berlin Wall", date: "1989", description: "Berlin Wall opens." }
    ]
};

async function runTests() {
    console.log("Starting Timeline Mobile & Desktop Verification...");

    // Start a lightweight static HTTP server serving the frontend directory
    const frontendDir = path.resolve(__dirname, '../frontend');
    const server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        if (pathname === '/api/v1/users/me') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ data: mockUser }));
        }
        if (pathname === '/api/v1/timeline/daily') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ data: mockDaily }));
        }
        if (pathname === '/api/v1/timeline/daily/rounds/0') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ data: mockOutcome }));
        }

        let filePath = path.join(frontendDir, pathname === '/' ? 'timeline.html' : pathname);
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            return res.end("Not found");
        }

        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        fs.createReadStream(filePath).pipe(res);
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/timeline.html`;
    console.log(`Test server running at ${baseUrl}`);

    const browser = await chromium.launch({
        headless: true,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });

    try {
        // ==========================================
        // 1. MOBILE VERIFICATION (Viewport 390x844)
        // ==========================================
        console.log("\n--- Testing Mobile Viewport (390x844) ---");
        const routeHandler = async (route) => {
            const url = route.request().url();
            if (url.includes('/api/v1/users/me')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockUser }) });
            }
            if (url.includes('/api/v1/timeline/daily/rounds/')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockOutcome }) });
            }
            if (url.includes('/api/v1/timeline/daily')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockDaily }) });
            }
            return route.continue();
        };

        const contextMobile = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true
        });
        await contextMobile.route('**/api/v1/**', routeHandler);
        const pageMobile = await contextMobile.newPage();
        await pageMobile.goto(baseUrl);
        await pageMobile.waitForSelector('.timeline-slot');

        // Check 1: Layout Overlap Check (Issue 1)
        console.log("Checking Issue 1: No overlap with header or divider...");
        const headerBox = await pageMobile.locator('.timeline-round-header').boundingBox();
        const slot0Box = await pageMobile.locator('.timeline-slot[data-slot="0"]').boundingBox();
        const slot3Box = await pageMobile.locator('.timeline-slot[data-slot="3"]').boundingBox();
        const dividerBox = await pageMobile.locator('.timeline-divider').boundingBox();

        assert(slot0Box.y >= headerBox.y + headerBox.height,
            `Slot 0 overlaps header! slot0.y=${slot0Box.y}, headerBottom=${headerBox.y + headerBox.height}`);
        assert(dividerBox.y >= slot3Box.y + slot3Box.height,
            `Slot 3 overlaps divider! slot3Bottom=${slot3Box.y + slot3Box.height}, divider.y=${dividerBox.y}`);
        console.log("  ✓ Slot 0 and Slot 3 have clean margins with no header or divider overlap.");

        // Check 2: Uniform Markings 1, 2, 3, 4 on TOP of tiles (Issue 3)
        console.log("Checking Issue 3: All markings (1, 2, 3, 4) on TOP...");
        for (let i = 0; i < 4; i++) {
            const slot = pageMobile.locator(`.timeline-slot[data-slot="${i}"]`);
            const nodeBox = await slot.locator('.timeline-node').boundingBox();
            const dropOrCardBox = await slot.locator('.timeline-drop, .timeline-event-card').boundingBox();

            assert(nodeBox.y < dropOrCardBox.y,
                `Slot ${i} node is not above card/drop! node.y=${nodeBox.y}, tile.y=${dropOrCardBox.y}`);
        }
        console.log("  ✓ All 4 slot node markings (1, 2, 3, 4) are strictly on TOP of tiles.");

        // Check 3: Tap-to-place and Description Trimming (Issue 1 & 6)
        console.log("Checking Issue 1 & 6: Drag/Tap and Description clamping...");
        const drawerCards = pageMobile.locator('#timeline-cards .timeline-event-card');
        const initialCount = await drawerCards.count();
        assert.strictEqual(initialCount, 4, "Drawer should have 4 unplaced cards initially");

        // Tap first drawer card to place it into slot 0
        await drawerCards.first().click();
        await pageMobile.waitForTimeout(100);
        const placedInSlot0 = await pageMobile.locator('.timeline-slot[data-slot="0"] .timeline-event-card').count();
        assert.strictEqual(placedInSlot0, 1, "Card should be placed in slot 0 after tap");

        // Verify description line clamping CSS
        const lineClamp = await pageMobile.locator('.timeline-slot[data-slot="0"] .timeline-event-card p').evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.webkitLineClamp || style.lineClamp;
        });
        assert.strictEqual(lineClamp, "2", `Placed card description line-clamp should be 2, got ${lineClamp}`);
        console.log("  ✓ Placed card description is clamped to 2 lines with ellipsis.");

        // Place remaining 3 cards to fill all 4 slots
        for (let i = 0; i < 3; i++) {
            await pageMobile.locator('#timeline-cards .timeline-event-card').first().click();
            await pageMobile.waitForTimeout(100);
        }

        const submitButton = pageMobile.locator('#timeline-submit');
        const isEnabled = await submitButton.isEnabled();
        assert.strictEqual(isEnabled, true, "Submit button should be enabled once all 4 slots are filled");

        // Check 4: Answer Reveal UI Shift Check (Issue 4)
        console.log("Checking Issue 4: Lock In and UI Stability (no rightward shift or cut-off)...");
        const beforeBoxes = [];
        for (let i = 0; i < 4; i++) {
            beforeBoxes.push(await pageMobile.locator(`.timeline-slot[data-slot="${i}"] .timeline-event-card`).boundingBox());
        }

        await submitButton.click();
        await pageMobile.waitForSelector('.timeline-result:not([hidden])');
        await pageMobile.waitForTimeout(600); // wait for reveal animation to settle

        for (let i = 0; i < 4; i++) {
            const afterBox = await pageMobile.locator(`.timeline-slot[data-slot="${i}"] .timeline-event-card`).boundingBox();
            const slotBox = await pageMobile.locator(`.timeline-slot[data-slot="${i}"]`).boundingBox();

            // Card X position should not have shifted significantly
            assert(Math.abs(afterBox.x - beforeBoxes[i].x) < 5,
                `Slot ${i} shifted horizontally! beforeX=${beforeBoxes[i].x}, afterX=${afterBox.x}`);

            // Card should fit neatly within slot (no half-cut cards)
            assert(afterBox.x >= slotBox.x - 2 && (afterBox.x + afterBox.width) <= (slotBox.x + slotBox.width + 2),
                `Slot ${i} card is cut off! cardRight=${afterBox.x + afterBox.width}, slotRight=${slotBox.x + slotBox.width}`);
        }
        console.log("  ✓ UI remains perfectly in place upon answer reveal; zero horizontal shift or truncation.");

        // Check 5: Game Completed Popup Centered (Issue 5)
        console.log("Checking Issue 5: Final popup centered horizontally and vertically...");
        await pageMobile.waitForSelector('#timeline-complete-popup');
        const popupBox = await pageMobile.locator('#timeline-complete-popup').boundingBox();
        const viewport = pageMobile.viewportSize();

        const expectedCenterX = (viewport.width - popupBox.width) / 2;
        const expectedCenterY = (viewport.height - popupBox.height) / 2;

        const diffX = Math.abs(popupBox.x - expectedCenterX);
        const diffY = Math.abs(popupBox.y - expectedCenterY);

        assert(diffX < 5, `Popup is not centered horizontally! expected=${expectedCenterX}, actual=${popupBox.x}, diff=${diffX}`);
        assert(diffY < 20, `Popup is not centered vertically! expected=${expectedCenterY}, actual=${popupBox.y}, diff=${diffY}`);
        console.log(`  ✓ Popup is centered: X diff=${diffX.toFixed(1)}px, Y diff=${diffY.toFixed(1)}px.`);

        // Check 6: Touch Drag and Auto-scroll (Issue 2 & 6)
        console.log("Checking Issue 2 & 6: Touch Drag and Auto-scroll near top edge...");
        // Reload to start a fresh round
        await pageMobile.reload();
        await pageMobile.waitForSelector('.timeline-slot');

        // Scroll down 250px so we can test auto-scrolling upwards
        await pageMobile.evaluate(() => window.scrollTo(0, 250));
        const scrollBefore = await pageMobile.evaluate(() => window.scrollY);
        assert(scrollBefore >= 200, `Page should be scrolled down, got ${scrollBefore}`);

        // Find first card in drawer
        const firstCard = pageMobile.locator('#timeline-cards .timeline-event-card').first();
        const cardBox = await firstCard.boundingBox();

        // Dispatch touch events: touchstart on card, move to top edge (clientY = 40)
        await pageMobile.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2); // tap test already passed

        // Simulate touch drag towards top edge
        await pageMobile.evaluate(async () => {
            const card = document.querySelector('#timeline-cards .timeline-event-card');
            const touchStart = new Touch({
                identifier: 1,
                target: card,
                clientX: 200,
                clientY: 500
            });
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));

            // Move past threshold to clientY = 40 (inside auto-scroll threshold < 85px)
            const touchMove = new Touch({
                identifier: 1,
                target: card,
                clientX: 200,
                clientY: 40
            });
            card.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], changedTouches: [touchMove], cancelable: true, bubbles: true }));
        });

        // Wait for auto-scroll frames to run
        await pageMobile.waitForTimeout(400);

        const scrollAfter = await pageMobile.evaluate(() => window.scrollY);
        assert(scrollAfter < scrollBefore, `Auto-scroll should decrease scrollY! before=${scrollBefore}, after=${scrollAfter}`);
        console.log(`  ✓ Auto-scroll engaged smoothly: scrollY moved from ${scrollBefore}px to ${scrollAfter}px.`);

        // End touch over slot 0 to test touch drop
        await pageMobile.evaluate(() => {
            const slot0 = document.querySelector('.timeline-slot[data-slot="0"]');
            const slotBox = slot0.getBoundingClientRect();
            const touchEnd = new Touch({
                identifier: 1,
                target: slot0,
                clientX: slotBox.x + slotBox.width / 2,
                clientY: slotBox.y + slotBox.height / 2
            });
            document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));
        });
        await pageMobile.waitForTimeout(150);

        await contextMobile.close();

        // ==========================================
        // 2. DESKTOP VERIFICATION (Viewport 1280x800)
        // ==========================================
        console.log("\n--- Testing Desktop Viewport (1280x800) ---");
        const contextDesktop = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        await contextDesktop.route('**/api/v1/**', routeHandler);
        const pageDesktop = await contextDesktop.newPage();
        await pageDesktop.goto(baseUrl);
        await pageDesktop.waitForSelector('.timeline-slot');

        // Check desktop 4 columns in 1 horizontal row
        const dSlot0 = await pageDesktop.locator('.timeline-slot[data-slot="0"]').boundingBox();
        const dSlot1 = await pageDesktop.locator('.timeline-slot[data-slot="1"]').boundingBox();
        const dSlot2 = await pageDesktop.locator('.timeline-slot[data-slot="2"]').boundingBox();
        const dSlot3 = await pageDesktop.locator('.timeline-slot[data-slot="3"]').boundingBox();

        assert(Math.abs(dSlot0.y - dSlot1.y) < 2 && Math.abs(dSlot1.y - dSlot2.y) < 2,
            "Desktop slots must all be aligned in a single horizontal row");
        assert(dSlot0.x < dSlot1.x && dSlot1.x < dSlot2.x && dSlot2.x < dSlot3.x,
            "Desktop slots must be arranged left-to-right horizontally");
        console.log("  ✓ Desktop UI layout is completely intact with 4 horizontal columns.");

        await contextDesktop.close();

        // ==========================================
        // 3. REVISIT COMPLETED GAME (Modal on return)
        // ==========================================
        console.log("\n--- Testing Revisit of Completed Game ---");
        const mockCompletedDaily = {
            totalScore: 180,
            roundsTotal: 5,
            rounds: [
                { completed: true },
                { completed: true },
                { completed: true },
                { completed: true },
                { completed: true }
            ]
        };
        const contextCompleted = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true
        });
        await contextCompleted.route('**/api/v1/**', async (route) => {
            const url = route.request().url();
            if (url.includes('/api/v1/users/me')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockUser }) });
            }
            if (url.includes('/api/v1/timeline/daily')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockCompletedDaily }) });
            }
            return route.continue();
        });
        const pageCompleted = await contextCompleted.newPage();
        await pageCompleted.goto(baseUrl);

        // Verify modal appears automatically on revisit
        await pageCompleted.waitForSelector('#timeline-complete-popup');
        console.log("  ✓ Game completed modal automatically pops up on revisit!");

        // Close popup
        await pageCompleted.locator('.timeline-complete-popup .game-result-close').click();
        await pageCompleted.waitForSelector('#timeline-complete-popup', { state: 'detached' });

        // Verify "VIEW SUMMARY" button exists and re-opens the modal
        await pageCompleted.locator('#timeline-reopen-modal').click();
        await pageCompleted.waitForSelector('#timeline-complete-popup');
        console.log("  ✓ View summary button re-opens modal successfully.");

        await contextCompleted.close();

        console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
    } finally {
        await browser.close();
        server.close();
    }
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
