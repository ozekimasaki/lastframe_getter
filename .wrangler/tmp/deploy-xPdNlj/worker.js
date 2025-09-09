// src/worker.ts
var worker_default = {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === "GET") {
      const url = new URL(request.url);
      const indexReq = new Request(new URL("/index.html", url.origin).toString(), {
        method: "GET",
        headers: request.headers
      });
      response = await env.ASSETS.fetch(indexReq);
    }
    return response;
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
