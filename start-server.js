const { spawn } = require('child_process');

console.log('Starting backend server...');
const server = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  shell: true
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Keep the script running
setTimeout(() => {
  console.log('Server should be running now...');
}, 3000);
