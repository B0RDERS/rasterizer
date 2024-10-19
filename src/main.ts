import vertShader from './shaders/vert.wgsl?raw';
import fragShader from './shaders/frag.wgsl?raw';
import * as cube from './models/cube';
import { mat4, quat, vec3, vec4 } from 'gl-matrix';

const MODELS = 8;
const LIGHTS = 3;
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
  arrayStride: 6 * Float32Array.BYTES_PER_ELEMENT, // 3 position
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
const lightBindGroupLayout = device.createBindGroupLayout({
  label: "Light group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "uniform",
      }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      }
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "read-only-storage",
      }
    }
  ]
});
const modelBindGroupLayout = device.createBindGroupLayout({
  label: "Model group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage",
      }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage",
      }
    }
  ]
});
const cameraBindGroupLayout = device.createBindGroupLayout({
  label: "Camera group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "uniform",
      }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "uniform",
      }
    }
  ]
});
const pipeline = device.createRenderPipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [
      lightBindGroupLayout,
      modelBindGroupLayout,
      cameraBindGroupLayout
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
    cullMode: 'back'
  },
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
// vertex
const vertexBuffer = device.createBuffer({
  label: 'Vertex buffer',
  size: cube.vertex.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(vertexBuffer, 0, cube.vertex);
// lights
const lCntBuffer = device.createBuffer({
  label: 'Light position buffer',
  size: Int32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
const lPosBuffer = device.createBuffer({
  label: 'Light position buffer',
  size: 3 * 4 * LIGHTS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const lColBuffer = device.createBuffer({
  label: 'Light color buffer',
  size: 4 * 4 * LIGHTS,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
const lGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  label: "Light group",
  entries: [
    { binding: 0, resource: { buffer: lCntBuffer } },
    { binding: 1, resource: { buffer: lPosBuffer } },
    { binding: 2, resource: { buffer: lColBuffer } },
  ],
});
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
  layout: pipeline.getBindGroupLayout(1),
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
  layout: pipeline.getBindGroupLayout(2),
  label: "Camera group",
  entries: [
    { binding: 0, resource: { buffer: vpBuffer } },
    { binding: 1, resource: { buffer: cPosBuffer } },
  ],
});

let aspect = size.width / size.height;

const mBufferLoc = new Float32Array(MODELS * 4 * 4);
const colBufferLoc = new Float32Array(MODELS * 4);
const vpBufferLoc = new Float32Array(4 * 4);
const cPosBufferLoc = new Float32Array(4);
const lPosBufferLoc = new Float32Array(LIGHTS * 3);
const lColBufferLoc = new Float32Array(LIGHTS * 4);

function frame() {
  const now = Date.now() / 1000;
  // set models
  for (let i = 0; i < MODELS; ++i) {
    const x=i%2, y=Math.floor((i%4)/2), z=Math.floor(i/4);
    const tl = vec3.fromValues(-2+x*4, -2+y*4, -2+z*4);
    const rot = quat.fromEuler(quat.create(), 0, 0, (y?1:-1)*now*360/2);
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
    const pos = vec3.fromValues(Math.sin(now/4)*10, 0, Math.cos(now/4)*10);
    // const pos = vec3.fromValues(0, 0, 10);
    const lookAt = vec3.fromValues(0, 0, 0);
    const up = vec3.fromValues(0, 1, 0);
    const view = mat4.lookAt(mat4.create(), pos, lookAt, up);
    const proj = mat4.perspective(mat4.create(), Math.PI/2, aspect, .001, 100000);
    const vpMatrix = mat4.mul(mat4.create(), proj, view);
    vpBufferLoc.set(vpMatrix);
    cPosBufferLoc.set(pos);
  }
  device.queue.writeBuffer(lCntBuffer, 0, new Int32Array([MODELS]));
  device.queue.writeBuffer(vpBuffer, 0, vpBufferLoc);
  device.queue.writeBuffer(cPosBuffer, 0, cPosBufferLoc);
  // set lights
  {
    lPosBufferLoc.set([
      0, Math.cos(now)*10, Math.sin(now)*10,
      Math.sin(now)*10, 0, Math.cos(now)*10,
      Math.cos(now)*10, Math.sin(now)*10, 0
    ]);
    lColBufferLoc.set([
      1, 0, 0, 10,
      0, 1, 0, 10,
      0, 0, 1, 10
    ]);
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
  passEncoder.setBindGroup(0, lGroup);
  passEncoder.setBindGroup(1, mGroup);
  passEncoder.setBindGroup(2, cGroup);
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