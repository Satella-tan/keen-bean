import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { DeviceType } from './worker-types';

export interface ModelProgressInfo {
  status: string;
  progress?: number;
  file?: string;
}

export type ProgressCallback = (info: ModelProgressInfo) => void;

export class BrowserEmbeddingEngine {
  private pipeline: FeatureExtractionPipeline | null = null;
  private currentModelId: string | null = null;
  private currentDevice: DeviceType = 'wasm';

  public async init(
    modelId: string,
    devicePreference: 'auto' | 'webgpu' | 'wasm' = 'auto',
    onProgress?: ProgressCallback
  ): Promise<{ device: DeviceType; initTimeMs: number }> {
    const startTime = performance.now();

    const progressCallback = (data: Record<string, unknown>) => {
      if (onProgress) {
        onProgress({
          status: String(data.status || 'loading'),
          progress: typeof data.progress === 'number' ? Math.round(data.progress) : undefined,
          file: typeof data.file === 'string' ? data.file : undefined,
        });
      }
    };

    let selectedDevice: DeviceType = 'wasm';

    if (devicePreference === 'webgpu') {
      // Check if WebGPU is supported by the browser environment
      const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
      if (hasWebGpu) {
        try {
          if (onProgress) onProgress({ status: 'Initializing WebGPU (FP32)...' });
          // Note: WebGPU execution provider has incomplete support for QLinearMatMul in q8,
          // which corrupts INT8 embeddings into near-zero values. We use fp32 for WebGPU.
          const pipeFn = pipeline as (...args: unknown[]) => Promise<FeatureExtractionPipeline>;
          this.pipeline = await pipeFn('feature-extraction', modelId, {
            device: 'webgpu',
            dtype: 'fp32',
            progress_callback: progressCallback,
          });
          selectedDevice = 'webgpu';
        } catch (webGpuErr) {
          console.warn('WebGPU initialization failed, falling back to WASM/CPU:', webGpuErr);
          if (onProgress) onProgress({ status: 'WebGPU unavailable, falling back to WASM/CPU...' });
          this.pipeline = null;
        }
      }
    }

    if (!this.pipeline) {
      // Default & reliable engine: WASM with Q8 quantization (~30MB download, 10-15ms inference, numerically exact)
      if (onProgress) onProgress({ status: 'Loading model on WASM/CPU (Q8)...' });
      const pipeFn = pipeline as (...args: unknown[]) => Promise<FeatureExtractionPipeline>;
      this.pipeline = await pipeFn('feature-extraction', modelId, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progressCallback,
      });
      selectedDevice = 'wasm';
    }

    this.currentModelId = modelId;
    this.currentDevice = selectedDevice;

    const initTimeMs = Math.round(performance.now() - startTime);
    return { device: selectedDevice, initTimeMs };
  }

  public async embed(text: string): Promise<Float32Array> {
    if (!this.pipeline) {
      throw new Error('Embedding engine is not initialized. Call init() first.');
    }

    // Mean pooling + L2 normalization
    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    if (output && 'data' in output && output.data) {
      return output.data instanceof Float32Array
        ? output.data
        : new Float32Array(output.data as ArrayLike<number>);
    }

    if (Array.isArray(output)) {
      const flat = Array.isArray(output[0]) ? output[0] : output;
      return new Float32Array(flat);
    }

    throw new Error('Unexpected output format from Transformers.js pipeline');
  }

  public get modelId(): string | null {
    return this.currentModelId;
  }

  public get device(): DeviceType {
    return this.currentDevice;
  }
}
