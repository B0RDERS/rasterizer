import vertShader from './shaders/vert.wgsl?raw';
import fragShader from './shaders/frag.wgsl?raw';
import * as cube from './models/cube';
import { mat4, vec3, vec4 } from 'gl-matrix';

const MODELS = 8;
const LIGHTS = 2;
const canvas = document.querySelector('canvas');
if (!canvas)
  throw new Error('No Canvas');
if (!navigator.gpu)
  throw new Error('Not Support WebGPU');
const adapter = await navigator.gpu.requestAdapter();
if (!adapter)
  throw new Error('No Adapter Found');
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu') as GPUCanvasContext;
const format = navigator.gpu.getPreferredCanvasFormat();
const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const size = { width: canvas.width, height: canvas.height };
context.configure({
  device, format,
  // prevent chrome warning after v102
  alphaMode: 'opaque'
});

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 6 * 4, // 3 position
  attributes: [
    {
      // position
      shaderLocation: 0,
      offset: 0,
      format: 'float32x3',
    },
    {
      // normal
      shaderLocation: 1,
      offset: 3 * 4,
      format: 'float32x3',
    }
  ]
}
const modelBindGroupLayout = device.createBindGroupLayout({
  label: "Model group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage",
      },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage",
      },
    },
  ],
});
const cameraBindGroupLayout = device.createBindGroupLayout({
  label: "Camera group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "uniform",
      },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "uniform",
      },
    },
  ],
});
const lightBindGroupLayout = device.createBindGroupLayout({
  label: "Light group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      },
    },
  ],
});
const pipeline = device.createRenderPipeline({
  label: 'Basic Pipline',
  layout: device.createPipelineLayout({
    bindGroupLayouts: [
      modelBindGroupLayout,
      cameraBindGroupLayout,
      lightBindGroupLayout
    ]
  }),
  vertex: {
    module: device.createShaderModule({
      code: vertShader,
    }),
    entryPoint: 'main',
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: device.createShaderModule({
      code: fragShader,
    }),
    entryPoint: 'main',
    targets: [
      {
        format: format
      }
    ]
  },
  primitive: {
    topology: 'triangle-list',
    // Culling backfaces pointing away from the camera
    cullMode: 'back'
  },
  // Enable depth testing since we have z-level positions
  // Fragment closest to the camera is rendered in front
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  }
} as GPURenderPipelineDescriptor);
// create depthTexture for renderPass
let depthTexture = device.createTexture({
  size, format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
let depthView = depthTexture.createView();

const vertexBuffer = device.createBuffer({
  label: 'Vertex buffer',
  size: cube.vertex.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(vertexBuffer, 0, cube.vertex);
// model
const mBuffer = device.createBuffer({
  label: 'Models buffer',
  size: 4 * 4 * 4 * MODELS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const colBuffer = device.createBuffer({
  label: 'Colors buffer',
  size: 4 * 4 * MODELS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const mGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  label: "Model group",
  entries: [
    { binding: 0, resource: { buffer: mBuffer } },
    { binding: 1, resource: { buffer: colBuffer } },
  ],
});
// camera
const vpBuffer = device.createBuffer({
  label: 'View/Projection buffer',
  size: 4 * 4 * 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
const cPosBuffer = device.createBuffer({
  label: 'View/Projection buffer',
  size: 4 * 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
const cGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(1),
  label: "Camera group",
  entries: [
    { binding: 0, resource: { buffer: vpBuffer } },
    { binding: 1, resource: { buffer: cPosBuffer } },
  ],
});
// lights
const lPosBuffer = device.createBuffer({
  label: 'Light position buffer',
  size: 4 * 4 * LIGHTS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const lColBuffer = device.createBuffer({
  label: 'Light color buffer',
  size: 4 * 4 * LIGHTS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const lGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(2),
  label: "Light group",
  entries: [
    { binding: 0, resource: { buffer: lPosBuffer } },
    { binding: 1, resource: { buffer: lColBuffer } },
  ],
});

let aspect = size.width / size.height;

const mBufferLoc = new Float32Array(MODELS * 4 * 4);
const colBufferLoc = new Float32Array(MODELS * 4);
const vpBufferLoc = new Float32Array(4 * 4);
const lPosBufferLoc = new Float32Array(LIGHTS * 4);
const lColBufferLoc = new Float32Array(LIGHTS * 4);

function frame() {
  const now = Date.now() / 1000;
  // set models
  for (let i = 0; i < MODELS; ++i) {
    const x=i%2, y=Math.floor((i%4)/2), z=Math.floor(i/4);
    const tl = vec3.fromValues(-2+x*4, -2+y*4, -2+z*4);
    const rot = vec4.fromValues(1, 0, 0 ,0);
    const scl = vec3.fromValues(1, 1, 1);
    const mMatrix = mat4.fromRotationTranslationScale(mat4.create(), rot, tl, scl);
    const col = vec4.fromValues(x, y, z, 1);
    mBufferLoc.set(mMatrix, i * 4 * 4);
    colBufferLoc.set(col, i * 4);
  }
  device.queue.writeBuffer(mBuffer, 0, mBufferLoc);
  device.queue.writeBuffer(colBuffer, 0, colBufferLoc);
  // set view / projection matrix
  {
    const pos = vec3.fromValues(Math.sin(now)*10, 0, Math.cos(now)*10);
    const lookAt = vec3.fromValues(0, Math.sin(now), 0);
    const up = vec3.fromValues(0, 1, 0);
    const view = mat4.lookAt(mat4.create(), pos, lookAt, up);
    const proj = mat4.perspective(mat4.create(), Math.PI/2, aspect, .001, 100000);
    const vpMatrix = mat4.mul(mat4.create(), proj, view);
    vpBufferLoc.set(vpMatrix);
  }
  device.queue.writeBuffer(vpBuffer, 0, vpBufferLoc);
  // set lights
  for(let i = 0; i < LIGHTS; ++i) {
    const pos = vec4.fromValues(10, 0, 0, 1);
    const col = vec4.fromValues(1, 1, 1, 100);
    lPosBufferLoc.set(pos, i*4);
    lColBufferLoc.set(col, i*4);
  }
  device.queue.writeBuffer(lPosBuffer, 0, lPosBufferLoc);
  device.queue.writeBuffer(lColBuffer, 0, lColBufferLoc);

  const commandEncoder = device.createCommandEncoder();
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ],
    depthStencilAttachment: {
      view: depthView,
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    }
  };
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, mGroup);
  passEncoder.setBindGroup(1, cGroup);
  passEncoder.setBindGroup(2, lGroup);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(cube.vertexCount, MODELS);
  passEncoder.end();
  // webgpu run in a separate process, all the commands will be executed after submit
  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => {
  size.width = canvas.width = canvas.clientWidth * devicePixelRatio;
  size.height = canvas.height = canvas.clientHeight * devicePixelRatio;
  depthTexture.destroy();
  depthTexture = device.createTexture({
    size, format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  depthView = depthTexture.createView();
  aspect = size.width / size.height;
});