const strip = require('strip-comments');

const count = 16;
const size = 16;
const spacing = 1;
const width = count * (size + spacing) - spacing;

import examples from './examples.json';

const input = document.getElementById('input');
const editor = document.getElementById('editor');
const comment = document.getElementById('comment');
const output = document.getElementById('output');
const context = output.getContext('2d');
const dpr = window.devicePixelRatio || 1;

let callback = function () { };
let startTime = null;
let code = '';

output.width = output.height = width * dpr;
context.scale(dpr, dpr);
output.style.width = output.style.height = `${width}px`;

function fetchGist(gist) {
  function extractCode(file) {
    if (file.truncated === true) {
      throw 'Javascript file larger them 1MB'
    } else {
      return strip(file.content)
        .split(/[\r\n]+/)
        .map(line => line.trim())
        .join('')
    }
  }

  function extractFile(files) {
    const keys = Object.keys(files).filter(key => key.endsWith('.js'))
    let key

    if (files['tixy.js']) {
      key = 'tixy.js'
    } else if (keys.length === 0) {
      throw 'No javascript file found'
    } else if (keys.length > 1) {
      throw 'Found multiple javascript file but no tixy.js'
    } else {
      key = keys[0];
    }

    return files[key]
  }

  fetch(`https://api.github.com/gists/${gist}`)
    .then(response => response.ok ? response.json() : Promise.reject(response))
    .then(response => extractFile(response.files))
    .then(file => extractCode(file))
    .then(code => {
      input.value = code;
      submitCode(code);
      updateCallback()
    })
    .catch(error => console.log(error) && updateComments(['Could not loading Gist', error]))
}

function readURL() {
  const url = new URL(document.location);

  if (url.searchParams.has('code')) {
    input.value = url.searchParams.get('code');
  } else if (url.searchParams.has('gist')) {
    fetchGist(url.searchParams.get('gist'));
  }
}

function submitCode(code) {
  const url = new URL(document.location);
  url.searchParams.set('code', code);
  history.replaceState(null, code, url);
}

readURL();

function checkLength() {
  if (code.length > 32) {
    editor.classList.add('over-limit');
  } else {
    editor.classList.remove('over-limit');
  }
}

function updateCallback() {
  code = input.value;
  startTime = null;

  checkLength();

  try {
    callback = new Function('t', 'i', 'x', 'y', `
      try {
        with (Math) {
          return ${code};
        }
      } catch (error) {
        return error;
      }
    `);
  } catch (error) {
    callback = null;
  }
}

input.addEventListener('input', updateCallback);
updateCallback();

input.addEventListener('focus', function () {
  editor.classList.add('focus');
  updateComments([
    'hit "enter" to save in URL',
    'or get <a href="https://twitter.com/aemkei/status/1323399877611708416">more info here</a>'
  ]);
});

input.addEventListener('blur', function () {
  updateCommentsForCode();
  editor.classList.remove('focus');
});

editor.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCode(code)
});

function render() {
  let time = 0;

  if (startTime) {
    time = (new Date() - startTime) / 1000;
  } else {
    startTime = new Date();
  }

  if ( ! callback) {
    window.requestAnimationFrame(render);
    return;
  }

  output.width = output.height = width * dpr;
  context.scale(dpr, dpr);
  let index = 0;
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      const value = Number(callback(time, index, x, y));
      const offset = size / 2;
      let color = '#FFF';
      let radius = (value * size) / 2;

      if (radius < 0) {
        radius = -radius;
        color = '#F24';
      }

      if (radius > size / 2) {
        radius = size / 2;
      }

      context.beginPath();
      context.fillStyle = color;
      context.arc(
        x * (size + spacing) + offset,
        y * (size + spacing) + offset,
        radius,
        0,
        2 * Math.PI
      );
      context.fill();
      index++;
    }
  }

  window.requestAnimationFrame(render);
}

render();

function updateComments(comments) {
  const lines = comment.querySelectorAll('label');

  if (comments.length === 1) {
    lines[0].innerHTML = '&nbsp;';
    lines[1].innerHTML = `// ${comments[0]}`;
  } else {
    lines[0].innerHTML = `// ${comments[0]}`;
    lines[1].innerHTML = `// ${comments[1]}`;
  }
}

function updateCommentsForCode() {
  const code = input.value;

  const snippets = Object.values(examples);
  const comments = Object.keys(examples);
  const index = snippets.indexOf(code);
  const newComment = comments[index];

  if ( ! newComment) {
    return;
  }

  const newComments = newComment.split('\n');

  updateComments(newComments);
}

function nextExample() {
  const snippets = Object.values(examples);

  let index = snippets.indexOf(code);

  if (snippets[index + 1]) {
    index = index + 1;
  } else {
    return;
  }

  const newCode = snippets[index];
  input.value = newCode;

  updateCommentsForCode();

  // history.replaceState({
  //   code: newCode,
  //   comment: newComment
  // }, code, `?code=${encodeURIComponent(newCode)}`);

  updateCallback();
}

output.addEventListener('click', nextExample);

window.onpopstate = function (event) {
  readURL();
  updateCallback();
};

updateCommentsForCode();
