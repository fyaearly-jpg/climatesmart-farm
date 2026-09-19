// tests/server-render.ts — merender React (termasuk Server Component async) ke string HTML
// lewat renderer streaming server (Fizz), lalu menunggu semua Suspense selesai.
import { Writable } from "node:stream";
import type { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";

export function renderToHtml(element: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });
    sink.on("finish", () => resolve(html.replaceAll("<!-- -->", "")));
    const stream = renderToPipeableStream(element, {
      onAllReady() {
        stream.pipe(sink);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}
