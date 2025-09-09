import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
	const [videoFile, setVideoFile] = useState<File | null>(null)
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const lastProcessedKeyRef = useRef<string | null>(null)

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setError(null)
		setImageUrl(null)
		const file = e.target.files?.[0] ?? null
		setVideoFile(file)
	}, [])

	const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setIsDragging(false)
		setError(null)
		setImageUrl(null)
		const file = e.dataTransfer.files?.[0]
		if (file && /video\/(mp4|webm)/.test(file.type)) {
			setVideoFile(file)
		} else {
			setError('mp4 または webm の動画ファイルをドロップしてください。')
		}
	}, [])

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback(() => {
		setIsDragging(false)
	}, [])

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	async function waitForEvent(target: EventTarget, eventName: string): Promise<void> {
		return new Promise((resolve) => {
			const handler = () => resolve()
			target.addEventListener(eventName, handler, { once: true })
		})
	}

	async function seek(video: HTMLVideoElement, time: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const onSeeked = () => resolve()
			const onError = () => reject(new Error('Failed to seek video.'))
			video.addEventListener('seeked', onSeeked, { once: true })
			video.addEventListener('error', onError, { once: true })
			try {
				video.currentTime = time
			} catch (e) {
				reject(e)
			}
		})
	}

	async function extractLastFrame(file: File): Promise<Blob> {
		const url = URL.createObjectURL(file)
		const video = document.createElement('video')
		video.preload = 'auto'
		video.muted = true
		video.playsInline = true
		video.src = url

		await waitForEvent(video, 'loadedmetadata')

		const width = video.videoWidth
		const height = video.videoHeight
		if (!width || !height) {
			URL.revokeObjectURL(url)
			throw new Error('動画の寸法を取得できません。')
		}

		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')
		if (!ctx) {
			URL.revokeObjectURL(url)
			throw new Error('Canvas コンテキストの取得に失敗しました。')
		}

		// 最後の 1 フレームへシーク（ごく僅か手前に設定）
		const epsilon = 0.000001
		const targetTime = Math.max(0, video.duration - epsilon)
		await seek(video, targetTime)

		ctx.drawImage(video, 0, 0, width, height)

		const blob: Blob = await new Promise((resolve, reject) => {
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像の生成に失敗しました。'))), 'image/png')
		})

		URL.revokeObjectURL(url)
		return blob
	}

	const handleExtract = useCallback(async () => {
		if (!videoFile) return
		setError(null)
		setIsProcessing(true)
		setImageUrl(null)
		try {
			const blob = await extractLastFrame(videoFile)
			const previewUrl = URL.createObjectURL(blob)
			setImageUrl(previewUrl)
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : '未知のエラーが発生しました。'
			setError(message)
		} finally {
			setIsProcessing(false)
		}
	}, [videoFile])

	// ダウンロード処理（コントロール行のボタンから実行）
	const handleDownload = useCallback(() => {
		if (!imageUrl) return
		const a = document.createElement('a')
		a.href = imageUrl
		a.download = (videoFile?.name || 'lastframe') + '.png'
		document.body.appendChild(a)
		a.click()
		a.remove()
	}, [imageUrl, videoFile])

	// アップロード/ドロップ時に自動抽出
	useEffect(() => {
		if (!videoFile) {
			lastProcessedKeyRef.current = null
			return
		}
		const key = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`
		if (lastProcessedKeyRef.current === key) return
		lastProcessedKeyRef.current = key
		void handleExtract()
	}, [videoFile, handleExtract])

	const handleClear = useCallback(() => {
		setVideoFile(null)
		if (imageUrl) URL.revokeObjectURL(imageUrl)
		setImageUrl(null)
		setError(null)
		if (videoRef.current) {
			videoRef.current.src = ''
		}
	}, [imageUrl])

	return (
		<div className="app-container">
			<header className="header">
				<h1>Last Frame Getter</h1>
				<p className="subtitle">mp4 / webm の最後の 1 フレームを画像(PNG)にします</p>
			</header>

			<section
				className={`dropzone${isDragging ? ' is-dragging' : ''}`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragEnter={handleDragOver}
				onDragLeave={handleDragLeave}
				role="button"
				tabIndex={0}
				aria-busy={isProcessing}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						openFilePicker()
					}
				}}
			>
				<div className="dropzone-inner">
					<p className="dropzone-text">
						ここにファイルをドラッグ＆ドロップするか、
						<button className="button linklike" onClick={openFilePicker} type="button">
							ファイルを選択
						</button>
					</p>
					<p className="hint">アップロードすると自動で抽出します（対応形式: mp4, webm）</p>
					<input
						ref={fileInputRef}
						className="file-input"
						type="file"
						accept="video/mp4,video/webm"
						onChange={handleFileChange}
					/>
				</div>
			</section>

			<div className="controls">
				<button className="primary" onClick={handleDownload} disabled={!imageUrl}>
					ダウンロード
				</button>
				<button onClick={handleClear} disabled={!videoFile && !imageUrl}>
					クリア
				</button>
			</div>

			{error && (
				<p className="error" role="alert" aria-live="polite">
					{error}
				</p>
			)}

			<div className="preview">
				{imageUrl ? (
					<div className="preview-card">
						<img src={imageUrl} alt="last frame preview" />
					</div>
				) : (
					<p className="placeholder">ここにプレビューが表示されます</p>
				)}
			</div>

			{/* 非表示のビデオ要素（デバッグ/将来拡張用） */}
			<video ref={videoRef} style={{ display: 'none' }} />
		</div>
	)
}

export default App
