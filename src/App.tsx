import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
	const [videoFile, setVideoFile] = useState<File | null>(null)
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [fps, setFps] = useState<number>(30)
	const [selectedFrame, setSelectedFrame] = useState<number>(0)
	const [maxFrames, setMaxFrames] = useState<number>(1)
	const [error, setError] = useState<string | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const videoObjectUrlRef = useRef<string | null>(null)
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const renderTokenRef = useRef<number>(0)

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setError(null)
		if (imageUrl) URL.revokeObjectURL(imageUrl)
		setImageUrl(null)
		const file = e.target.files?.[0] ?? null
		setVideoFile(file)
	}, [imageUrl])

	const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setIsDragging(false)
		setError(null)
		if (imageUrl) URL.revokeObjectURL(imageUrl)
		setImageUrl(null)
		const file = e.dataTransfer.files?.[0]
		if (file && /video\/(mp4|webm)/.test(file.type)) {
			setVideoFile(file)
		} else {
			setError('mp4 または webm の動画ファイルをドロップしてください。')
		}
	}, [imageUrl])

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

	async function renderFrameByIndex(index: number): Promise<void> {
		const video = videoRef.current
		if (!video) return
		const width = video.videoWidth
		const height = video.videoHeight
		if (!width || !height) return
		const epsilon = 0.000001
		const duration = video.duration || 0
		const time = Math.min(Math.max(0, index / Math.max(1, fps)), Math.max(0, duration - epsilon))
		const token = ++renderTokenRef.current
		setIsProcessing(true)
		try {
			await seek(video, time)
			if (token !== renderTokenRef.current) return
			const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'))
			if (canvas.width !== width) canvas.width = width
			if (canvas.height !== height) canvas.height = height
			const ctx = canvas.getContext('2d')
			if (!ctx) throw new Error('Canvas コンテキストの取得に失敗しました。')
			ctx.drawImage(video, 0, 0, width, height)
			const blob: Blob = await new Promise((resolve, reject) => {
				canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像の生成に失敗しました。'))), 'image/png')
			})
			if (token !== renderTokenRef.current) return
			if (imageUrl) URL.revokeObjectURL(imageUrl)
			const url = URL.createObjectURL(blob)
			setImageUrl(url)
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : '未知のエラーが発生しました。'
			setError(message)
		} finally {
			if (token === renderTokenRef.current) setIsProcessing(false)
		}
	}

	const handleDownload = useCallback(() => {
		if (!imageUrl) return
		const a = document.createElement('a')
		a.href = imageUrl
		const base = (videoFile?.name || 'frame').replace(/\.(mp4|webm)$/i, '')
		a.download = `${base}-frame-${selectedFrame}.png`
		document.body.appendChild(a)
		a.click()
		a.remove()
	}, [imageUrl, videoFile, selectedFrame])

	useEffect(() => {
		if (!videoFile) {
			// クリーンアップ
			if (imageUrl) URL.revokeObjectURL(imageUrl)
			setImageUrl(null)
			if (videoObjectUrlRef.current) {
				URL.revokeObjectURL(videoObjectUrlRef.current)
				videoObjectUrlRef.current = null
			}
			return
		}
		const video = videoRef.current
		if (!video) return
		// 新しい動画の読み込み
		const objectUrl = URL.createObjectURL(videoFile)
		videoObjectUrlRef.current = objectUrl
		video.src = objectUrl
		const setup = async () => {
			await waitForEvent(video, 'loadedmetadata')
			const width = video.videoWidth
			const height = video.videoHeight
			if (!width || !height) throw new Error('動画の寸法を取得できません。')
			const duration = video.duration || 0
			const totalFrames = Math.max(1, Math.floor(duration * Math.max(1, fps)))
			setMaxFrames(totalFrames)
			setSelectedFrame(Math.max(0, totalFrames - 1))
		}
		void setup()
		return () => {
			// 切り替え時の後始末
			if (imageUrl) URL.revokeObjectURL(imageUrl)
			setImageUrl(null)
		}
	}, [videoFile])

	useEffect(() => {
		const video = videoRef.current
		if (!video || !videoFile) return
		const duration = video.duration || 0
		const total = Math.max(1, Math.floor(duration * Math.max(1, fps)))
		setMaxFrames(total)
		setSelectedFrame((prev) => Math.min(prev, total - 1))
	}, [fps, videoFile])

	useEffect(() => {
		if (!videoFile) return
		void renderFrameByIndex(selectedFrame)
	}, [selectedFrame, fps, videoFile])

	const handleClear = useCallback(() => {
		setVideoFile(null)
		if (imageUrl) URL.revokeObjectURL(imageUrl)
		setImageUrl(null)
		setError(null)
		if (videoRef.current) {
			videoRef.current.src = ''
		}
		if (videoObjectUrlRef.current) {
			URL.revokeObjectURL(videoObjectUrlRef.current)
			videoObjectUrlRef.current = null
		}
	}, [imageUrl])

	return (
		<div className="app-container">
			<header className="header">
				<h1>Last Frame Getter</h1>
				<p className="subtitle">mp4 / webm の指定フレームを画像(PNG)にします</p>
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

			<div className="controls" style={{ flexDirection: 'column', alignItems: 'center' }}>
				<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
					<label>
						FPS
						<input
							style={{ marginLeft: 8, width: 80 }}
							type="number"
							min={1}
							max={120}
							value={fps}
							onChange={(e) => setFps(() => Math.max(1, Math.min(120, Number(e.target.value) || 30)))}
						/>
					</label>
					<label>
						Frame
						<input
							style={{ marginLeft: 8, width: 100 }}
							type="number"
							min={0}
							max={Math.max(0, maxFrames - 1)}
							value={selectedFrame}
							onChange={(e) => setSelectedFrame(() => Math.max(0, Math.min(Math.max(0, maxFrames - 1), Number(e.target.value) || 0)))}
						/>
					</label>
				</div>
				<input
					style={{ width: '100%', maxWidth: 640 }}
					type="range"
					min={0}
					max={Math.max(0, maxFrames - 1)}
					step={1}
					value={selectedFrame}
					onChange={(e) => setSelectedFrame(Number(e.target.value))}
				/>
				<div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
					<button className="primary" onClick={handleDownload} disabled={!imageUrl || isProcessing}>
						このフレームをダウンロード
					</button>
					<button onClick={handleClear} disabled={!videoFile && !imageUrl}>
						クリア
					</button>
				</div>
			</div>

			{error && (
				<p className="error" role="alert" aria-live="polite">
					{error}
				</p>
			)}

			<div className="preview">
				{imageUrl ? (
					<div className="preview-card">
						<img src={imageUrl} alt={`frame preview ${selectedFrame}`} />
					</div>
				) : (
					<p className="placeholder">ここにプレビューが表示されます</p>
				)}
			</div>

			<footer className="footer">
				<p>© 2025 Last Frame Getter</p>
			</footer>

			{/* 非表示のビデオ要素（デバッグ/将来拡張用） */}
			<video ref={videoRef} style={{ display: 'none' }} />
		</div>
	)
}

export default App
