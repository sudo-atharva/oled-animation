// JavaScript for OLED Animation Tool
console.log('OLED Animation Tool initialized');

// Add event listeners for UI elements
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const resolutionSelect = document.getElementById('resolution');
const uploadButton = document.getElementById('upload-image');
const imageInput = document.getElementById('image-input');
const exportButton = document.getElementById('export-code');
const addFrameButton = document.getElementById('add-frame');
const output = document.getElementById('output-code');

// Update canvas size based on resolution
resolutionSelect.addEventListener('change', () => {
  const [width, height] = resolutionSelect.value.split('x').map(Number);
  canvas.width = width;
  canvas.height = height;
  drawPixelGrid();
});

// Show file input when upload button is clicked
uploadButton.addEventListener('click', () => {
  imageInput.click();
});

// Handle image upload
imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = URL.createObjectURL(file);
  }
});

// Draw pixel grid on canvas
function drawPixelGrid() {
  const [width, height] = [canvas.width, canvas.height];
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#ccc';
  for (let x = 0; x < width; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// Add functionality to convert image to monochrome bitmap and export as U8g2 code
function convertToMonochrome() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const monochromeData = [];

  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grayscale = data[index] * 0.3 + data[index + 1] * 0.59 + data[index + 2] * 0.11;
      const bit = grayscale < 128 ? 1 : 0;
      row = (row << 1) | bit;
      if ((x + 1) % 8 === 0 || x === width - 1) {
        monochromeData.push(row);
        row = 0;
      }
    }
  }

  return { monochromeData, width, height };
}

function exportU8g2Code() {
  const { monochromeData, width, height } = convertToMonochrome();
  let code = `static const unsigned char bitmap[] PROGMEM = {\n`;

  for (let i = 0; i < monochromeData.length; i++) {
    code += `0x${monochromeData[i].toString(16).padStart(2, '0')}, `;
    if ((i + 1) % 12 === 0) code += '\n';
  }

  code += `};\n\n`;
  code += `// Example usage:\n`;
  code += `u8g2.drawXBM(0, 0, ${width}, ${height}, bitmap);\n`;

  output.textContent = code;
}

// Add support for multiple frames and export as a sequence
const frames = [];
function addFrame() {
  const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  frames.push(frameData);
}

function exportFrames() {
  let code = '';
  frames.forEach((frame, index) => {
    ctx.putImageData(frame, 0, 0);
    const { monochromeData, width, height } = convertToMonochrome();
    code += `static const unsigned char frame${index}[] PROGMEM = {\n`;

    for (let i = 0; i < monochromeData.length; i++) {
      code += `0x${monochromeData[i].toString(16).padStart(2, '0')}, `;
      if ((i + 1) % 12 === 0) code += '\n';
    }

    code += `};\n\n`;
  });

  code += `// Example usage for animation:\n`;
  code += `for (int i = 0; i < ${frames.length}; i++) {\n`;
  code += `  u8g2.drawXBM(0, 0, ${frames[0].width}, ${frames[0].height}, frame[i]);\n`;
  code += `  delay(100);\n`;
  code += `}\n`;

  output.textContent = code;
}

// Add animation preview functionality
let isPlaying = false;
let currentFrame = 0;
let frameDelay = 100;
let animationInterval;

function playAnimation() {
  if (frames.length === 0) return;
  isPlaying = true;
  animationInterval = setInterval(() => {
    ctx.putImageData(frames[currentFrame], 0, 0);
    currentFrame = (currentFrame + 1) % frames.length;
  }, frameDelay);
}

function pauseAnimation() {
  isPlaying = false;
  clearInterval(animationInterval);
}

function toggleAnimation() {
  if (isPlaying) {
    pauseAnimation();
  } else {
    playAnimation();
  }
}

function setFrameDelay(delay) {
  frameDelay = delay;
  if (isPlaying) {
    pauseAnimation();
    playAnimation();
  }
}

// Add UI elements for playback controls
const playPauseButton = document.createElement('button');
playPauseButton.textContent = 'Play/Pause';
playPauseButton.addEventListener('click', toggleAnimation);

document.body.appendChild(playPauseButton);

const delayInput = document.createElement('input');
delayInput.type = 'number';
delayInput.value = frameDelay;
delayInput.addEventListener('change', (event) => {
  setFrameDelay(Number(event.target.value));
});

document.body.appendChild(delayInput);

// Add buttons for exporting and adding frames
exportButton.addEventListener('click', exportU8g2Code);
addFrameButton.addEventListener('click', addFrame);

// Add dark mode toggle functionality
const darkModeToggle = document.createElement('button');
darkModeToggle.textContent = 'Toggle Dark Mode';
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});
document.body.appendChild(darkModeToggle);

// Add save/load animation project as .json
function saveProject() {
  const projectData = { frames, frameDelay, canvasWidth: canvas.width, canvasHeight: canvas.height };
  const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'animation_project.json';
  link.click();
}

function loadProject(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const projectData = JSON.parse(e.target.result);
      frames.length = 0;
      frames.push(...projectData.frames);
      frameDelay = projectData.frameDelay;
      canvas.width = projectData.canvasWidth;
      canvas.height = projectData.canvasHeight;
      drawPixelGrid();
    };
    reader.readAsText(file);
  }
}

const saveButton = document.createElement('button');
saveButton.textContent = 'Save Project';
saveButton.addEventListener('click', saveProject);
document.body.appendChild(saveButton);

const loadInput = document.createElement('input');
loadInput.type = 'file';
loadInput.accept = '.json';
loadInput.addEventListener('change', loadProject);
document.body.appendChild(loadInput);

// Add export as .h file functionality
function exportAsHFile() {
  const { monochromeData, width, height } = convertToMonochrome();
  let code = `#ifndef ANIMATION_H\n#define ANIMATION_H\n\n`;
  code += `static const unsigned char bitmap[] PROGMEM = {\n`;

  for (let i = 0; i < monochromeData.length; i++) {
    code += `0x${monochromeData[i].toString(16).padStart(2, '0')}, `;
    if ((i + 1) % 12 === 0) code += '\n';
  }

  code += `};\n\n#endif // ANIMATION_H\n`;

  const blob = new Blob([code], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'animation.h';
  link.click();
}

const exportHButton = document.createElement('button');
exportHButton.textContent = 'Export as .h';
exportHButton.addEventListener('click', exportAsHFile);
document.body.appendChild(exportHButton);

// Add OLED size selection functionality
resolutionSelect.addEventListener('change', () => {
  const [width, height] = resolutionSelect.value.split('x').map(Number);
  canvas.width = width;
  canvas.height = height;
  drawPixelGrid();
});

// Initialize canvas with default resolution
drawPixelGrid();