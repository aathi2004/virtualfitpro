/// <reference types="vite/client" />

declare module '@mediapipe/pose' {
  export const POSE_LANDMARKS: Record<string, number>
  export const POSE_CONNECTIONS: number[][]
  export class Pose {
    constructor(config: { locateFile: (file: string) => string })
    setOptions(options: {
      modelComplexity?: number
      smoothLandmarks?: boolean
      enableSegmentation?: boolean
      smoothSegmentation?: boolean
      minDetectionConfidence?: number
      minTrackingConfidence?: number
    }): void
    onResults(callback: (results: any) => void): void
    send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>
    close(): void
  }
}

declare module '@mediapipe/camera_utils' {
  export class Camera {
    constructor(
      videoElement: HTMLVideoElement,
      options: {
        onFrame: () => Promise<void> | void
        width?: number
        height?: number
        facingMode?: string
      }
    )
    start(): Promise<void>
    stop(): void
  }
}
