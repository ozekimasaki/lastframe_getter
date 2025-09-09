export interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> }
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// まず静的アセットとして解決
		let response = await env.ASSETS.fetch(request)

		// 見つからない場合、SPA 用に /index.html を返す（GET のみ）
		if (response.status === 404 && request.method === 'GET') {
			const url = new URL(request.url)
			const indexReq = new Request(new URL('/index.html', url.origin).toString(), {
				method: 'GET',
				headers: request.headers,
			})
			response = await env.ASSETS.fetch(indexReq)
		}

		return response
	},
}
