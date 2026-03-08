To build an elite extraction engine, you need to graduate from "scraping websites" to "extracting intelligence from chaos." We define the four levels of the **Yosoi Gauntlet** by their structural hostility.

Each level is designed to break a specific assumption in a naive scraper's logic.

---

### Level 1: The Semantic Baseline

**The Goal:** Verify the core extraction engine works under perfect conditions.

* **The Structure:** Pristine, machine-readable HTML. This uses `<article>`, `<header>`, `<h1>`, and `<table>` tags exactly as the W3C intended.
* **The Challenge:** None. This is your "Control Group." If Yosoi fails here, your LLM prompt or core DOM parser is fundamentally broken.
* **Success Metric:** 100% accuracy with sub-100ms latency.

---

### Level 2: The Modern "Swamp"

**The Goal:** Test resilience against modern frontend bloat and hydration delays.

* **The Structure:** Total "Div-Soup." No semantic tags. Every element is a `<div>` or `<span>`. It uses CSS-in-JS or Scoped CSS, meaning class names are randomized hashes (e.g., `.css-1y8xz`).
* **The Challenge:** * **Timing:** The content is hidden behind an 850ms+ JS execution delay.
* **Reasoning:** The scraper cannot use tag names to find the title. It must use **visual hierarchy** (e.g., "The largest text at the top is likely the title").


* **Success Metric:** Correct data extraction despite the lack of semantic hints and the presence of framework-injected metadata.

---

### Level 3: Active Hostility (The Gauntlet)

**The Goal:** Test the ability to pierce technical barriers used by complex apps and sophisticated data-protection.

* **The Structure:** Uses **Shadow DOM** and **Web Components**. Data is encapsulated in isolated roots that standard `document.querySelector` cannot see.
* **The Challenge:** * **Encapsulation:** Yosoi must inject scripts or use deep-traversal logic to pierce Shadow Roots (Lit components).
* **Honeypots:** Includes "invisible" elements that look like data to a bot but are hidden from humans. If Yosoi extracts the invisible text, it fails.
* **Reactivity:** Uses SolidJS or React to mutate the DOM instantly. The scraper must prove it can "lock on" to a moving target.


* **Success Metric:** Piercing the Shadow DOM boundary without returning "null" or getting trapped by honeypot nodes.

---

### Level 4: Anti-Bot Hell (The Production Wall)

**The Goal:** Test the agent's ability to behave like a high-signal human operator.

* **The Structure:** This level integrates Cloudflare-style challenges, CAPTCHAs, and behavioral analysis.
* **The Challenge:**
* **Browser Fingerprinting:** The site checks for headless browser signatures (Puppeteer/Playwright defaults).
* **Canvas/SVG Masking:** The most critical data (like a price or phone number) isn't text at all—it's drawn onto a `<canvas>` or rendered as a complex `<svg>` path.
* **Behavioral Gates:** The data only hydrates if the agent simulates organic mouse movement, scrolling, and varied dwell times.


* **Success Metric:** Passing a Turnstile/CAPTCHA challenge and using Vision-LLM capabilities to "read" the data off a Canvas element.

---

### Summary Matrix

| Level | Name | Technical Focus | Yosoi Requirement |
| --- | --- | --- | --- |
| **1** | **Baseline** | Semantics | Core Logic Validation |
| **2** | **The Swamp** | Div-Soup & Hydration | Spatial Reasoning & Timing |
| **3** | **Hostility** | Shadow DOM & Honeypots | Script Injection & Filtering |
| **4** | **Hell** | Fingerprinting & Canvas | Human Emulation & Vision |

---

JS Frameworks and their use-cases for gauntlet:

1. React: The Virtual DOM Trap

React does not update the real DOM directly. It updates a Virtual DOM (VDOM) in memory, calculates the difference, and then commits the changes in batches.

    The Extraction Challenge: Stale Element References. When React reconciles its VDOM with the real browser DOM, it often destroys and recreates elements entirely rather than just updating their text. If yosoi uses a headless browser to locate a <button> to click for a product variant, and React re-renders the page during that millisecond, the scraper's reference points to an element that no longer exists in the browser's memory. The scraper crashes.

    What Yosoi Must Learn: It must learn to dynamically re-query elements after interactions and wait for React's reconciliation cycle to finish before attempting to extract the mutated data.

2. Vue (or Svelte): The Asynchronous Swamp

Vue uses a proxy-based reactivity system. When state changes, it queues the updates asynchronously. This is the baseline you built in Level 2.

    The Extraction Challenge: Lifecycle Delays and Hash Noise. Vue heavily utilizes onMounted lifecycle hooks (causing hydration delays) and scoped CSS, which injects unpredictable hashes like data-v-f64b0c8c into every single node.

    What Yosoi Must Learn: The AI must learn to completely ignore attribute noise. It cannot rely on finding class="author-name". It must rely entirely on spatial reasoning (e.g., finding the text node nearest to the date) and wait out the async rendering queues.

3. SolidJS: The Stealth Mutator

SolidJS is the philosophical opposite of React. It completely abandons the Virtual DOM. When you compile Solid, it creates precise, direct bindings to actual DOM nodes.

    The Extraction Challenge: Micro-Mutations. When a price changes from $10 to $15 in SolidJS, it does not re-render the parent <div>. It surgically swaps the text node instantly. If yosoi relies on broad MutationObserver scripts that watch for large blocks of HTML to change before triggering an extraction, it will completely miss Solid's localized updates and scrape the old data.

    What Yosoi Must Learn: It must lock onto the specific target node and handle lightning-fast, highly localized state changes without waiting for a structural shift in the page layout.

4. Lit: The Shadow Wall

Lit is built entirely around standard Web Components and forces the use of the Shadow DOM. This is the hardest structural barrier before hitting active anti-bot measures.

    The Extraction Challenge: Encapsulation. The Shadow DOM creates a hidden tree inside the standard document. If a Lit component renders an article title, and yosoi executes document.querySelector('h1') or document.body.innerText, the browser will return nothing. The data is walled off. Most off-the-shelf scrapers fail instantly here.

    What Yosoi Must Learn: The extraction pipeline must be capable of injecting JavaScript that recursively walks the DOM tree, specifically looking for element.shadowRoot, and piercing the boundary to extract the encapsulated data.

The Operational Reality

By placing these four islands on cascadinglabs.com, you are isolating the four hardest structural problems in web scraping. If your Langfuse logs show yosoi achieving high success rates across the React (VDOM), Vue (Async Proxy), Solid (Direct Binding), and Lit (Shadow DOM) routes, you have a dominant, production-ready product.