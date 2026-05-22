const revealItems = document.querySelectorAll(".reveal");
const shaderCanvas = document.querySelector(".shader-bg");
const progressPanel = document.querySelector(".site-progress");
const progressFill = document.querySelector(".progress-fill");
const progressLinks = document.querySelectorAll(".progress-link");
const trackedSections = [...progressLinks]
  .map((link) => document.querySelector(`#${link.dataset.section}`))
  .filter(Boolean);

document.querySelectorAll(".collection-card").forEach((card, index) => {
  card.style.transitionDelay = `${index * 80}ms`;
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateProgressNav() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pageProgress = clamp((window.scrollY / maxScroll) * 100, 0, 100);
  let activeId = trackedSections[0]?.id;

  trackedSections.forEach((section) => {
    const sectionTop = section.offsetTop - window.innerHeight * 0.35;

    if (window.scrollY >= sectionTop) {
      activeId = section.id;
    }
  });

  if (progressFill) {
    progressFill.style.height = `${pageProgress}%`;
  }

  progressLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.section === activeId);
  });

  if (progressPanel) {
    const works = document.querySelector("#works");
    const contact = document.querySelector("#contact");
    const hideAt = works ? works.offsetTop - window.innerHeight * 0.15 : Infinity;
    const showContactAt = contact ? contact.offsetTop - window.innerHeight * 0.45 : Infinity;
    const isContactArea = window.scrollY >= showContactAt;

    progressPanel.classList.toggle("is-hidden", window.scrollY >= hideAt && !isContactArea);
    progressPanel.classList.toggle("is-right", isContactArea);
  }
}

window.addEventListener("scroll", updateProgressNav, { passive: true });
window.addEventListener("resize", updateProgressNav);
updateProgressNav();

function initializeShaderBackground() {
  if (!shaderCanvas) {
    return;
  }

  const gl = shaderCanvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_time;
    varying vec2 v_uv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.02;
        amplitude *= 0.52;
      }

      return value;
    }

    void main() {
      vec2 uv = v_uv;
      vec2 centered = uv - 0.5;
      centered.x *= u_resolution.x / u_resolution.y;

      float time = u_time * 0.4;
      float angle = radians(50.0);
      mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 plane = rotation * (centered + vec2(-0.42, 0.0));
      float field = fbm(plane * 5.5 + vec2(time * 0.18, -time * 0.1));
      float wave = sin((plane.x + field * 0.35 + time * 0.12) * 8.2) * 0.5 + 0.5;
      float mask = smoothstep(0.14, 0.92, field * 0.72 + wave * 0.28);
      float ridge = smoothstep(0.52, 0.74, mask) - smoothstep(0.74, 0.95, mask);
      float vignette = smoothstep(1.15, 0.18, length(centered));

      vec3 color1 = vec3(0.031, 0.0, 0.0);
      vec3 color2 = vec3(0.824, 0.839, 0.859);
      vec3 color3 = vec3(0.0, 0.0, 0.024);
      vec3 color = mix(color1, color3, uv.x * 0.72 + uv.y * 0.18);
      color = mix(color, color2, ridge * 0.18);
      color *= 1.2 * vignette;

      float grain = hash(uv * u_resolution + u_time * 10.0) - 0.5;
      color += grain * 0.055;
      color = mix(vec3(0.0), color, 0.86);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return;
  }

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  function resizeShader() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.floor(shaderCanvas.clientWidth * ratio);
    const height = Math.floor(shaderCanvas.clientHeight * ratio);

    if (shaderCanvas.width !== width || shaderCanvas.height !== height) {
      shaderCanvas.width = width;
      shaderCanvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function renderShader(timestamp) {
    resizeShader();
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, shaderCanvas.width, shaderCanvas.height);
    gl.uniform1f(timeLocation, timestamp * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(renderShader);
  }

  requestAnimationFrame(renderShader);
}

initializeShaderBackground();
