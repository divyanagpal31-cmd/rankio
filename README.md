
  # Rankio Landing Page

  This is a code bundle for Rankio Landing Page. The original project is available at https://www.figma.com/design/hL60ja5arqPyWe2AwOqWIy/Rankio-Landing-Page.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Browser rendering / headless crawl

  The scan Edge Function can optionally fetch pages through a browser-rendering service before running the crawl extractors. This is useful for JavaScript-heavy sites whose meaningful HTML is not present in the initial server response.

  Configure `BROWSER_RENDER_URL` in the Supabase Edge Function environment. The value is the base URL of a rendering endpoint, not the URL of the site being scanned. Rankio sends the target page as a `url` query parameter and expects an HTML response:

  ```text
  # Disabled (default): omit the variable or leave it empty
  BROWSER_RENDER_URL=

  # Local renderer example
  BROWSER_RENDER_URL=http://127.0.0.1:3001/render

  # Browserless content endpoint example
  BROWSER_RENDER_URL=https://chrome.browserless.io/content?token=YOUR_BROWSERLESS_TOKEN
  ```

  For a URL containing existing query parameters, Rankio appends `&url=...`; otherwise it appends `?url=...`. The renderer should accept `GET /render?url=https%3A%2F%2Fexample.com`, wait for client-side rendering, and return the rendered document with an HTML content type such as `text/html`. If the renderer is unavailable or returns a non-HTML response, the scanner automatically falls back to the normal HTTP fetch.

  ### Test the rendering layer

  1. Deploy the `scan` function and set `BROWSER_RENDER_URL` in the Supabase project’s Edge Function secrets. For local development, set it with `supabase functions secrets set BROWSER_RENDER_URL=http://host.docker.internal:3001/render` when the renderer runs on the host machine.
  2. Run a scan for a JavaScript-heavy test page through the app or the `scan` function endpoint.
  3. Inspect the report response’s `raw_scan_data.crawler.rendering` object. A successful render includes `enabled: true` and `pagesRendered` greater than `0`; the discovery notes also include `Browser render layer applied to X page(s)`.
  4. Compare with `BROWSER_RENDER_URL` unset. The scan should still complete, with `enabled: false` and the normal raw-fetch behavior.

  You can verify the renderer independently before connecting it to Supabase:

  ```bash
  curl -i "http://127.0.0.1:3001/render?url=https%3A%2F%2Fexample.com"
  ```

  The response should be successful and have an HTML content type.
  
