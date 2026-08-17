export interface GpuSpec {
  name: string
  tflopsBf16: number
  bandwidthGbs: number
  vramGb: number
  color: string
}

export const GPUS: GpuSpec[] = [
  { name: 'A100 80GB SXM', tflopsBf16: 312, bandwidthGbs: 2039, vramGb: 80, color: '#22d3ee' },
  { name: 'H100 SXM', tflopsBf16: 989, bandwidthGbs: 3350, vramGb: 80, color: '#f59e0b' },
  { name: 'RTX 4090', tflopsBf16: 165, bandwidthGbs: 1008, vramGb: 24, color: '#fb7185' },
]

export const QWEN_SERVE = {
  params: 7.62e9,
  layers: 28,
  dModel: 3584,
  kvHeads: 4,
  headDim: 128,
  bytesPerElement: 2,
}

export function kvBytesPerToken(): number {
  return 2 * QWEN_SERVE.layers * QWEN_SERVE.kvHeads * QWEN_SERVE.headDim * QWEN_SERVE.bytesPerElement
}

export interface WorkloadPoint {
  label: string
  intensity: number
  attained: number
  utilization: number
  bound: 'memory' | 'compute'
}

export function decodePoint(batch: number, context: number, gpu: GpuSpec): WorkloadPoint {
  const P = QWEN_SERVE.params
  const flops = batch * (2 * P + 2 * QWEN_SERVE.dModel * context * QWEN_SERVE.layers)
  const bytes = P * QWEN_SERVE.bytesPerElement + batch * context * kvBytesPerToken()
  const intensity = flops / bytes
  const peakFlops = gpu.tflopsBf16 * 1e12
  const peakBytes = gpu.bandwidthGbs * 1e9
  const ridge = peakFlops / peakBytes
  const attained = Math.min(peakBytes * intensity, peakFlops)
  return {
    label: `decode · B=${batch}, ctx=${(context / 1024).toFixed(0)}k`,
    intensity,
    attained,
    utilization: attained / peakFlops,
    bound: intensity < ridge ? 'memory' : 'compute',
  }
}

export function prefillPoint(promptLen: number, gpu: GpuSpec): WorkloadPoint {
  const P = QWEN_SERVE.params
  const flops = promptLen * 2 * P
  const bytes = P * QWEN_SERVE.bytesPerElement
  const intensity = flops / bytes
  const peakFlops = gpu.tflopsBf16 * 1e12
  const peakBytes = gpu.bandwidthGbs * 1e9
  const ridge = peakFlops / peakBytes
  const attained = Math.min(peakBytes * intensity, peakFlops)
  return {
    label: `prefill · ${promptLen} tokens`,
    intensity,
    attained,
    utilization: attained / peakFlops,
    bound: intensity < ridge ? 'memory' : 'compute',
  }
}

export function ridgePoint(gpu: GpuSpec): number {
  return (gpu.tflopsBf16 * 1e12) / (gpu.bandwidthGbs * 1e9)
}

export function decodeTokensPerSec(batch: number, context: number, gpu: GpuSpec): number {
  const bytes = QWEN_SERVE.params * QWEN_SERVE.bytesPerElement + batch * context * kvBytesPerToken()
  return (gpu.bandwidthGbs * 1e9) / bytes
}

export function batchTokensPerSec(batch: number, context: number, gpu: GpuSpec): number {
  return decodeTokensPerSec(batch, context, gpu) * batch
}
