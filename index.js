const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const SCRIPT_DIR = path.join(__dirname, 'scripts');
const CACHE_DIR = path.join(__dirname, '.cache');
const HISTORY_FILE = path.join(__dirname, '.history');
const DEBUG_DIR = path.join(__dirname, '.debug');
const EXTRACT_DIR = path.join(SCRIPT_DIR, 'extracted');
const CODING_DIR = path.join(__dirname, 'coding');
const WEB_PROJECTS_DIR = path.join(__dirname, 'web-projects');
const VPS_CONFIG_FILE = path.join(__dirname, '.vps_config.json');

const DOWNLOAD_PATHS = [
  '/storage/emulated/0/Download/Telegram/',
  '/storage/emulated/0/Download/',
  '/sdcard/Download/Telegram/',
  '/sdcard/Download/'
];

function clearScreen() {
  console.clear();
}

function gradient(text) {
  const colors = ['\x1b[38;5;51m', '\x1b[38;5;87m', '\x1b[38;5;123m', '\x1b[38;5;159m', '\x1b[38;5;195m'];
  let result = '';
  const step = Math.max(1, Math.floor(text.length / colors.length));
  for (let i = 0; i < text.length; i++) {
    const colorIndex = Math.min(Math.floor(i / step), colors.length - 1);
    result += colors[colorIndex] + text[i];
  }
  return result + '\x1b[0m';
}

function drawBox(title, content, color = colors.cyan) {
  const width = 70;
  const topBorder = `${color}╔${'═'.repeat(width - 2)}╗${colors.reset}`;
  const bottomBorder = `${color}╚${'═'.repeat(width - 2)}╝${colors.reset}`;
  console.log(topBorder);
  const paddedTitle = ` ${title} `.padEnd(width - 2);
  console.log(`${color}║${colors.bright}${paddedTitle}${colors.reset}${color}║${colors.reset}`);
  console.log(`${color}╠${'═'.repeat(width - 2)}╣${colors.reset}`);
  if (Array.isArray(content)) {
    content.forEach(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      const displayLength = cleanLine.length;
      const padding = width - 4 - displayLength;
      console.log(`${color}║${colors.reset} ${line}${' '.repeat(padding > 0 ? padding : 0)} ${color}║${colors.reset}`);
    });
  } else {
    const paddedContent = ` ${content}`.padEnd(width - 2);
    console.log(`${color}║${colors.reset}${paddedContent}${color}║${colors.reset}`);
  }
  console.log(bottomBorder);
}

function createScriptDir() {
  [SCRIPT_DIR, CACHE_DIR, DEBUG_DIR, EXTRACT_DIR, CODING_DIR, WEB_PROJECTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function getScriptFiles() {
  createScriptDir();
  const files = fs.readdirSync(SCRIPT_DIR);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.js', '.sh', '.py', '.rb', '.php', '.go', '.zip', '.txt', '.md'].includes(ext);
  });
}

function getCodingProjects() {
  if (!fs.existsSync(CODING_DIR)) return [];
  const items = fs.readdirSync(CODING_DIR, { withFileTypes: true });
  return items.filter(item => item.isDirectory()).map(item => item.name);
}

function getWebProjects() {
  if (!fs.existsSync(WEB_PROJECTS_DIR)) return [];
  const items = fs.readdirSync(WEB_PROJECTS_DIR, { withFileTypes: true });
  return items.filter(item => item.isDirectory()).map(item => item.name);
}

function getExtractedFolders() {
  if (!fs.existsSync(EXTRACT_DIR)) return [];
  const items = fs.readdirSync(EXTRACT_DIR, { withFileTypes: true });
  return items.filter(item => item.isDirectory()).map(item => item.name);
}

function getVpsConfig() {
  try {
    if (fs.existsSync(VPS_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(VPS_CONFIG_FILE, 'utf8'));
    }
  } catch (error) {}
  return [];
}

function saveVpsConfig(config) {
  fs.writeFileSync(VPS_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function testVpsConnection(host, username, password) {
  return new Promise((resolve) => {
    const sshCommand = `ssh -o StrictHostKeyChecking=no ${username}@${host} 'echo "SUCCESS"'`;
    
    const child = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'PasswordAuthentication=yes',
      `${username}@${host}`,
      'echo "SUCCESS"'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0 && output.includes('SUCCESS')) {
        resolve({ success: true, message: 'VPS Connected Successfully' });
      } else {
        resolve({ success: false, message: 'Connection failed - Check credentials' });
      }
    });
    
    setTimeout(() => {
      child.kill();
      resolve({ success: false, message: 'Connection timeout' });
    }, 10000);
  });
}

function executeVpsCommand(host, username, password, command) {
  return new Promise((resolve) => {
    const child = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'PasswordAuthentication=yes',
      `${username}@${host}`,
      command
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ success: code === 0, output: output, error: error, code: code });
    });
    
    setTimeout(() => {
      child.kill();
      resolve({ success: false, output: '', error: 'Command timeout', code: 124 });
    }, 30000);
  });
}

function getZipStructure(zipPath) {
  try {
    const output = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
    const lines = output.split('\n');
    const files = [];
    for (let i = 3; i < lines.length - 2; i++) {
      const match = lines[i].match(/\s+\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
      if (match) files.push(match[1].trim());
    }
    return files;
  } catch (error) {
    return [];
  }
}

function getStorageInfo() {
  try {
    const homePath = process.env.HOME || __dirname;
    const dfOutput = execSync(`df -h "${homePath}" 2>/dev/null | tail -1`, { encoding: 'utf8' });
    const parts = dfOutput.trim().split(/\s+/);
    return {
      total: parts[1] || 'N/A',
      used: parts[2] || 'N/A',
      available: parts[3] || 'N/A',
      percent: parts[4] || 'N/A'
    };
  } catch (error) {
    return { total: '1T', used: '0B', available: '1T', percent: '0%' };
  }
}

function getDirSize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const output = execSync(`du -sb "${dirPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' });
    return parseInt(output.trim()) || 0;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function displayHeader() {
  console.log('');
  console.log(gradient(' ░▒▓██████▓▒░░▒▓████████▓▒░▒▓███████▓▒░ ░▒▓██████▓▒░       ░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓████████▓▒░▒▓██████▓▒░ ░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        '));
  console.log(gradient('░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░       ░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓████████▓▒░▒▓████████▓▒░'));
  console.log('');
  console.log(gradient('   ╔════════════════════════════════════════════════════════════════╗'));
  console.log(gradient('   ║          AERONULL PROJECT RUNNER v7.0                ║'));
  console.log(gradient('   ║       Advanced Multi-Purpose Script Management Tool           ║'));
  console.log(gradient('   ╚════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

function showAbout() {
  clearScreen();
  displayHeader();
  const aboutInfo = [
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`,
    `${colors.bright}${colors.green}TENTANG AERONULL PROJECT${colors.reset}`,
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`,
    '',
    `${colors.yellow}Versi:${colors.reset} 7.0`,
    `${colors.yellow}Dibuat:${colors.reset} 2025`,
    `${colors.yellow}Platform:${colors.reset} Termux/Linux/VPS`,
    '',
    `${colors.cyan}FITUR UTAMA:${colors.reset}`,
    `${colors.green}[+]${colors.reset} Script Runner (JS, Python, Bash, Ruby, PHP, Go)`,
    `${colors.green}[+]${colors.reset} ZIP Extractor & Manager`,
    `${colors.green}[+]${colors.reset} Coding Workspace`,
    `${colors.green}[+]${colors.reset} Web Projects dengan Port 3000`,
    `${colors.green}[+]${colors.reset} VPS Manager & Remote Control`,
    `${colors.green}[+]${colors.reset} Command Executor (npm, pm2, yarn, git)`,
    `${colors.green}[+]${colors.reset} File Editor & Manager`,
    `${colors.green}[+]${colors.reset} Storage Management`,
    `${colors.green}[+]${colors.reset} Project Generator`,
    '',
    `${colors.cyan}KEUNGGULAN:${colors.reset}`,
    `${colors.magenta}>>${colors.reset} Support All Commands`,
    `${colors.magenta}>>${colors.reset} Beautiful UI with ASCII`,
    `${colors.magenta}>>${colors.reset} Easy to Use`,
    `${colors.magenta}>>${colors.reset} Fast & Lightweight`,
    `${colors.magenta}>>${colors.reset} Full Control`,
    `${colors.magenta}>>${colors.reset} VPS & Termux Support`,
    '',
    `${colors.yellow}Gunakan dengan bijak!${colors.reset}`,
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`
  ];
  aboutInfo.forEach(line => console.log('  ' + line));
  waitForEnter();
}

function displayMenu() {
  clearScreen();
  displayHeader();
  const storage = getStorageInfo();
  console.log(`  ${colors.yellow}[STORAGE] ${storage.available} tersedia dari ${storage.total} (${storage.percent} terpakai)${colors.reset}\n`);
  const menuItems = [
    `${colors.bright}${colors.cyan}[1]${colors.reset}  Lihat Daftar Script`,
    `${colors.bright}${colors.cyan}[2]${colors.reset}  Jalankan Script`,
    `${colors.bright}${colors.cyan}[3]${colors.reset}  Tambah Script Baru`,
    `${colors.bright}${colors.cyan}[4]${colors.reset}  Hapus Script`,
    `${colors.bright}${colors.cyan}[5]${colors.reset}  Extract ZIP dari Download/VPS`,
    `${colors.bright}${colors.cyan}[6]${colors.reset}  Kelola ZIP Extracted`,
    `${colors.bright}${colors.cyan}[7]${colors.reset}  Jalankan Project`,
    `${colors.bright}${colors.cyan}[8]${colors.reset}  Coding Workspace`,
    `${colors.bright}${colors.cyan}[9]${colors.reset}  Web Projects (Port 3000)`,
    `${colors.bright}${colors.cyan}[10]${colors.reset} VPS Manager`,
    `${colors.bright}${colors.cyan}[11]${colors.reset} Run Command (Full Access)`,
    `${colors.bright}${colors.cyan}[12]${colors.reset} Storage & Cleanup`,
    `${colors.bright}${colors.cyan}[13]${colors.reset} Info AeroNull`,
    `${colors.bright}${colors.red}[0]${colors.reset}  Keluar`
  ];
  drawBox('MENU UTAMA', menuItems, colors.magenta);
  console.log('');
}

function vpsManagerMenu() {
  clearScreen();
  displayHeader();
  const menuItems = [
    `${colors.green}[1]${colors.reset} Tambah VPS Baru`,
    `${colors.green}[2]${colors.reset} Lihat Daftar VPS`,
    `${colors.green}[3]${colors.reset} Test Koneksi VPS`,
    `${colors.green}[4]${colors.reset} Jalankan Command di VPS`,
    `${colors.green}[5]${colors.reset} Transfer File ke VPS`,
    `${colors.green}[6]${colors.reset} Hapus VPS`,
    `${colors.green}[7]${colors.reset} Backup ke VPS`,
    `${colors.green}[8]${colors.reset} Kembali`
  ];
  drawBox('VPS MANAGER', menuItems, colors.cyan);
  console.log('');
  rl.question(`${colors.cyan}> Pilih opsi [1-8]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1': addVps(); break;
      case '2': listVps(); break;
      case '3': testVpsConnectionMenu(); break;
      case '4': runVpsCommand(); break;
      case '5': transferFileToVps(); break;
      case '6': deleteVps(); break;
      case '7': backupToVps(); break;
      case '8': mainMenu(); break;
      default: 
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function addVps() {
  rl.question(`\n${colors.cyan}> IP Address VPS: ${colors.reset}`, (host) => {
    if (!host.trim()) {
      console.log(`${colors.red}[X] IP Address tidak boleh kosong${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
      return;
    }
    
    rl.question(`${colors.cyan}> Username (default: root): ${colors.reset}`, (username) => {
      username = username.trim() || 'root';
      
      rl.question(`${colors.cyan}> Password: ${colors.reset}`, { silent: true }, (password) => {
        if (!password.trim()) {
          console.log(`${colors.red}[X] Password tidak boleh kosong${colors.reset}`);
          setTimeout(vpsManagerMenu, 1000);
          return;
        }
        
        const config = getVpsConfig();
        const vpsName = `ssh ${username}@${host}`;
        
        config.push({
          name: vpsName,
          host: host,
          username: username,
          password: password,
          added: new Date().toISOString()
        });
        
        saveVpsConfig(config);
        console.log(`\n${colors.green}[+] VPS "${vpsName}" berhasil ditambahkan!${colors.reset}\n`);
        waitForEnter();
      });
    });
  });
}

function listVps() {
  clearScreen();
  displayHeader();
  const config = getVpsConfig();
  
  if (config.length === 0) {
    drawBox('DAFTAR VPS', ['Tidak ada VPS yang terdaftar'], colors.yellow);
    waitForEnter();
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  drawBox('DAFTAR VPS', vpsList, colors.cyan);
  waitForEnter();
}

function testVpsConnectionMenu() {
  const config = getVpsConfig();
  
  if (config.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada VPS untuk di-test${colors.reset}`);
    setTimeout(vpsManagerMenu, 1000);
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  console.log('');
  drawBox('PILIH VPS UNTUK TEST', vpsList, colors.yellow);
  console.log('');
  
  rl.question(`${colors.cyan}> Pilih nomor VPS (0 untuk batal): ${colors.reset}`, async (choice) => {
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      vpsManagerMenu();
      return;
    }
    
    if (index >= 0 && index < config.length) {
      const vps = config[index];
      console.log(`\n${colors.cyan}Testing connection to ${vps.name}...${colors.reset}\n`);
      
      const result = await testVpsConnection(vps.host, vps.username, vps.password);
      
      if (result.success) {
        console.log(`${colors.green}[+] ${result.message}${colors.reset}\n`);
      } else {
        console.log(`${colors.red}[X] Connection failed: ${result.message}${colors.reset}\n`);
      }
      
      waitForEnter();
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function runVpsCommand() {
  const config = getVpsConfig();
  
  if (config.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada VPS untuk dijalankan${colors.reset}`);
    setTimeout(vpsManagerMenu, 1000);
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  console.log('');
  drawBox('PILIH VPS', vpsList, colors.green);
  console.log('');
  
  rl.question(`${colors.cyan}> Pilih nomor VPS (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      vpsManagerMenu();
      return;
    }
    
    if (index >= 0 && index < config.length) {
      const vps = config[index];
      
      rl.question(`${colors.cyan}> Masukkan command untuk dijalankan di VPS: ${colors.reset}`, async (command) => {
        if (!command.trim()) {
          console.log(`${colors.red}[X] Command tidak boleh kosong${colors.reset}`);
          setTimeout(vpsManagerMenu, 1000);
          return;
        }
        
        console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║ Running on VPS: ${vps.name}${' '.repeat(22 - vps.name.length)}║${colors.reset}`);
        console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
        
        console.log(`${colors.yellow}[!] Menunggu response dari VPS...${colors.reset}\n`);
        
        const result = await executeVpsCommand(vps.host, vps.username, vps.password, command);
        
        if (result.success) {
          if (result.output.trim()) {
            console.log(`${colors.green}[OUTPUT]${colors.reset}\n${result.output}`);
          } else {
            console.log(`${colors.green}[+] Command executed successfully${colors.reset}`);
          }
        } else {
          if (result.error.trim()) {
            console.log(`${colors.red}[ERROR]${colors.reset}\n${result.error}`);
          } else {
            console.log(`${colors.red}[X] Command failed${colors.reset}`);
          }
        }
        
        console.log(`\n${colors.green}[+] Command selesai dengan exit code: ${result.code}${colors.reset}\n`);
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function transferFileToVps() {
  const config = getVpsConfig();
  
  if (config.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada VPS untuk transfer file${colors.reset}`);
    setTimeout(vpsManagerMenu, 1000);
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  console.log('');
  drawBox('PILIH VPS', vpsList, colors.cyan);
  console.log('');
  
  rl.question(`${colors.cyan}> Pilih nomor VPS (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      vpsManagerMenu();
      return;
    }
    
    if (index >= 0 && index < config.length) {
      const vps = config[index];
      
      rl.question(`${colors.cyan}> Path file lokal: ${colors.reset}`, (localPath) => {
        if (!localPath.trim() || !fs.existsSync(localPath)) {
          console.log(`${colors.red}[X] File tidak ditemukan${colors.reset}`);
          setTimeout(vpsManagerMenu, 1000);
          return;
        }
        
        rl.question(`${colors.cyan}> Path tujuan di VPS: ${colors.reset}`, (remotePath) => {
          if (!remotePath.trim()) {
            console.log(`${colors.red}[X] Path tujuan tidak boleh kosong${colors.reset}`);
            setTimeout(vpsManagerMenu, 1000);
            return;
          }
          
          console.log(`\n${colors.cyan}Transferring file...${colors.reset}\n`);
          
          const scpCommand = `scp -o StrictHostKeyChecking=no "${localPath}" ${vps.username}@${vps.host}:"${remotePath}"`;
          
          const child = spawn('bash', ['-c', scpCommand], {
            stdio: 'inherit'
          });
          
          child.on('close', (code) => {
            if (code === 0) {
              console.log(`\n${colors.green}[+] File berhasil ditransfer ke VPS${colors.reset}\n`);
            } else {
              console.log(`\n${colors.red}[X] Gagal transfer file${colors.reset}\n`);
            }
            waitForEnter();
          });
        });
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function deleteVps() {
  const config = getVpsConfig();
  
  if (config.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada VPS untuk dihapus${colors.reset}`);
    setTimeout(vpsManagerMenu, 1000);
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  console.log('');
  drawBox('HAPUS VPS', vpsList, colors.red);
  console.log('');
  
  rl.question(`${colors.cyan}> Pilih nomor VPS (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      vpsManagerMenu();
      return;
    }
    
    if (index >= 0 && index < config.length) {
      rl.question(`${colors.red}> Yakin ingin menghapus "${config[index].name}"? (y/n): ${colors.reset}`, (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          config.splice(index, 1);
          saveVpsConfig(config);
          console.log(`\n${colors.green}[+] VPS berhasil dihapus${colors.reset}\n`);
        }
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function backupToVps() {
  const config = getVpsConfig();
  
  if (config.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada VPS untuk backup${colors.reset}`);
    setTimeout(vpsManagerMenu, 1000);
    return;
  }
  
  const vpsList = config.map((vps, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${vps.name}`;
  });
  
  console.log('');
  drawBox('PILIH VPS UNTUK BACKUP', vpsList, colors.cyan);
  console.log('');
  
  rl.question(`${colors.cyan}> Pilih nomor VPS (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      vpsManagerMenu();
      return;
    }
    
    if (index >= 0 && index < config.length) {
      const vps = config[index];
      
      console.log(`\n${colors.cyan}Membuat backup ke VPS ${vps.name}...${colors.reset}\n`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `aeronull-backup-${timestamp}.tar.gz`;
      const localBackupPath = path.join(__dirname, backupName);
      
      try {
        console.log(`${colors.yellow}[!] Membuat archive...${colors.reset}`);
        execSync(`tar -czf "${localBackupPath}" -C "${__dirname}" .`, { stdio: 'inherit' });
        
        console.log(`${colors.yellow}[!] Mengupload ke VPS...${colors.reset}`);
        const scpCommand = `scp -o StrictHostKeyChecking=no "${localBackupPath}" ${vps.username}@${vps.host}:~/`;
        
        const child = spawn('bash', ['-c', scpCommand], {
          stdio: 'inherit'
        });
        
        child.on('close', (code) => {
          fs.unlinkSync(localBackupPath);
          
          if (code === 0) {
            console.log(`\n${colors.green}[+] Backup berhasil dikirim ke VPS${colors.reset}\n`);
          } else {
            console.log(`\n${colors.red}[X] Gagal mengupload backup${colors.reset}\n`);
          }
          waitForEnter();
        });
      } catch (error) {
        console.log(`\n${colors.red}[X] Error saat backup: ${error.message}${colors.reset}\n`);
        waitForEnter();
      }
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(vpsManagerMenu, 1000);
    }
  });
}

function extractZipFromDownload() {
  console.log(`${colors.cyan}Mencari file ZIP...${colors.reset}\n`);
  
  const zipFiles = findZipFiles();
  const vpsConfig = getVpsConfig();
  
  if (zipFiles.length === 0 && vpsConfig.length === 0) {
    console.log(`${colors.red}[!] Tidak ada file ZIP di folder Download dan tidak ada VPS${colors.reset}`);
    waitForEnter();
    return;
  }
  
  const options = [];
  
  zipFiles.forEach((zip, index) => {
    const location = zip.location.includes('Telegram') ? '[TG]' : '[DL]';
    options.push(`${colors.green}${index + 1}.${colors.reset} ${location} ${zip.name}`);
  });
  
  vpsConfig.forEach((vps, index) => {
    options.push(`${colors.blue}${zipFiles.length + index + 1}.${colors.reset} [VPS] ${vps.name}`);
  });
  
  drawBox('PILIH SUMBER ZIP', options, colors.yellow);
  
  rl.question(`\n${colors.cyan}> Pilih nomor (ketik 'mask' untuk lihat isi, 0 untuk batal): ${colors.reset}`, async (choice) => {
    if (choice.toLowerCase() === 'mask') {
      showZipStructureMenu([...zipFiles, ...vpsConfig]);
      return;
    }
    
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      mainMenu();
      return;
    }
    
    if (index >= 0 && index < zipFiles.length) {
      const zipPath = zipFiles[index].path;
      const zipName = path.basename(zipPath, '.zip');
      const extractPath = path.join(EXTRACT_DIR, zipName);
      
      if (!fs.existsSync(EXTRACT_DIR)) {
        fs.mkdirSync(EXTRACT_DIR, { recursive: true });
      }
      
      console.log(`\n${colors.cyan}Extracting...${colors.reset}\n`);
      
      const child = spawn('unzip', ['-o', zipPath, '-d', extractPath], {
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`\n${colors.green}[+] File berhasil di-extract ke: ${extractPath}${colors.reset}\n`);
        } else {
          console.log(`\n${colors.red}[X] Gagal extract file${colors.reset}\n`);
        }
        waitForEnter();
      });
      
    } else if (index >= zipFiles.length && index < zipFiles.length + vpsConfig.length) {
      const vpsIndex = index - zipFiles.length;
      const vps = vpsConfig[vpsIndex];
      
      rl.question(`${colors.cyan}> Path file ZIP di VPS: ${colors.reset}`, async (remoteZipPath) => {
        if (!remoteZipPath.trim()) {
          console.log(`${colors.red}[X] Path tidak boleh kosong${colors.reset}`);
          waitForEnter();
          return;
        }
        
        const zipName = path.basename(remoteZipPath, '.zip');
        const extractPath = path.join(EXTRACT_DIR, `${vps.host}_${zipName}`);
        
        if (!fs.existsSync(EXTRACT_DIR)) {
          fs.mkdirSync(EXTRACT_DIR, { recursive: true });
        }
        
        console.log(`\n${colors.cyan}Downloading and extracting from VPS...${colors.reset}\n`);
        
        try {
          const localZipPath = path.join(EXTRACT_DIR, path.basename(remoteZipPath));
          
          console.log(`${colors.yellow}[!] Downloading from VPS...${colors.reset}`);
          const downloadCommand = `scp -o StrictHostKeyChecking=no ${vps.username}@${vps.host}:"${remoteZipPath}" "${localZipPath}"`;
          execSync(downloadCommand, { stdio: 'inherit' });
          
          console.log(`${colors.yellow}[!] Extracting...${colors.reset}`);
          execSync(`unzip -o "${localZipPath}" -d "${extractPath}"`, { stdio: 'inherit' });
          fs.unlinkSync(localZipPath);
          
          console.log(`\n${colors.green}[+] File berhasil di-extract dari VPS ke: ${extractPath}${colors.reset}\n`);
        } catch (error) {
          console.log(`\n${colors.red}[X] Gagal extract dari VPS: ${error.message}${colors.reset}\n`);
        }
        
        waitForEnter();
      });
    } else {
      console.log(`\n${colors.red}[X] Pilihan tidak valid${colors.reset}\n`);
      waitForEnter();
    }
  });
}

function codingWorkspace() {
  clearScreen();
  displayHeader();
  const menuItems = [
    `${colors.green}[1]${colors.reset} Buat Project Baru`,
    `${colors.green}[2]${colors.reset} Lihat Project`,
    `${colors.green}[3]${colors.reset} Edit Project`,
    `${colors.green}[4]${colors.reset} Run Project`,
    `${colors.green}[5]${colors.reset} Hapus Project`,
    `${colors.green}[6]${colors.reset} Kembali`
  ];
  drawBox('CODING WORKSPACE', menuItems, colors.cyan);
  console.log('');
  rl.question(`${colors.cyan}> Pilih opsi [1-6]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1': createCodingProject(); break;
      case '2': listCodingProjects(); break;
      case '3': editCodingProject(); break;
      case '4': runCodingProject(); break;
      case '5': deleteCodingProject(); break;
      case '6': mainMenu(); break;
      default: 
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(codingWorkspace, 1000);
    }
  });
}

function createCodingProject() {
  rl.question(`\n${colors.cyan}> Nama project: ${colors.reset}`, (projectName) => {
    if (!projectName.trim()) {
      console.log(`${colors.red}[X] Nama project tidak boleh kosong${colors.reset}`);
      setTimeout(codingWorkspace, 1000);
      return;
    }
    const projectPath = path.join(CODING_DIR, projectName);
    if (fs.existsSync(projectPath)) {
      console.log(`${colors.red}[X] Project sudah ada!${colors.reset}`);
      setTimeout(codingWorkspace, 1000);
      return;
    }
    const templates = [
      `${colors.green}[1]${colors.reset} Node.js (JavaScript)`,
      `${colors.green}[2]${colors.reset} Python`,
      `${colors.green}[3]${colors.reset} Bash Script`,
      `${colors.green}[4]${colors.reset} HTML/CSS/JS`,
      `${colors.green}[5]${colors.reset} Express.js API`,
      `${colors.green}[6]${colors.reset} React Project`,
      `${colors.green}[7]${colors.reset} Empty Project`
    ];
    console.log('');
    drawBox('PILIH TEMPLATE', templates, colors.yellow);
    console.log('');
    rl.question(`${colors.cyan}> Pilih template [1-7]: ${colors.reset}`, (templateChoice) => {
      fs.mkdirSync(projectPath, { recursive: true });
      switch (templateChoice) {
        case '1':
          fs.writeFileSync(path.join(projectPath, 'index.js'), 
            `console.log('Hello from AeroNull!');\n\nconst main = () => {\n  console.log('Project: ${projectName}');\n  console.log('Running...');\n};\n\nmain();\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "nodemon index.js"\n  }\n}\n`);
          break;
        case '2':
          fs.writeFileSync(path.join(projectPath, 'main.py'),
            `#!/usr/bin/env python3\n\ndef main():\n    print('Hello from AeroNull!')\n    print('Project: ${projectName}')\n    print('Running...')\n\nif __name__ == '__main__':\n    main()\n`);
          fs.writeFileSync(path.join(projectPath, 'requirements.txt'), '');
          break;
        case '3':
          fs.writeFileSync(path.join(projectPath, 'run.sh'),
            `#!/bin/bash\n\necho "Hello from AeroNull!"\necho "Project: ${projectName}"\necho "Running..."\n`);
          fs.chmodSync(path.join(projectPath, 'run.sh'), '755');
          break;
        case '4':
          fs.writeFileSync(path.join(projectPath, 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>AeroNull Project</h1>\n    <p>${projectName}</p>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>\n`);
          fs.writeFileSync(path.join(projectPath, 'style.css'),
            `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: Arial, sans-serif;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  min-height: 100vh;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\n.container {\n  text-align: center;\n  padding: 20px;\n}\n\nh1 {\n  font-size: 3rem;\n  margin-bottom: 20px;\n  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);\n}\n\np {\n  font-size: 1.5rem;\n}\n`);
          fs.writeFileSync(path.join(projectPath, 'script.js'),
            `console.log('Hello from ${projectName}!');\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('Page loaded successfully');\n});\n`);
          break;
        case '5':
          fs.writeFileSync(path.join(projectPath, 'server.js'),
            `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\napp.use(express.urlencoded({ extended: true }));\n\napp.get('/', (req, res) => {\n  res.json({ \n    message: 'AeroNull API', \n    project: '${projectName}',\n    status: 'running'\n  });\n});\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'OK', timestamp: new Date() });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}\n`);
          break;
        case '6':
          fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
          fs.mkdirSync(path.join(projectPath, 'public'), { recursive: true });
          fs.writeFileSync(path.join(projectPath, 'src', 'App.js'),
            `import React from 'react';\nimport './App.css';\n\nfunction App() {\n  return (\n    <div className="App">\n      <header className="App-header">\n        <h1>AeroNull Project</h1>\n        <p>${projectName}</p>\n      </header>\n    </div>\n  );\n}\n\nexport default App;\n`);
          fs.writeFileSync(path.join(projectPath, 'src', 'App.css'),
            `.App {\n  text-align: center;\n}\n\n.App-header {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  font-size: calc(10px + 2vmin);\n  color: white;\n}\n`);
          fs.writeFileSync(path.join(projectPath, 'src', 'index.js'),
            `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport './index.css';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`);
          fs.writeFileSync(path.join(projectPath, 'public', 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>${projectName}</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "private": true,\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "scripts": {\n    "start": "react-scripts start",\n    "build": "react-scripts build"\n  }\n}\n`);
          break;
        case '7':
          fs.writeFileSync(path.join(projectPath, 'README.md'),
            `# ${projectName}\n\nCreated with AeroNull Project Runner v7.0\n\n## Getting Started\n\nAdd your files and start coding!\n`);
          break;
        default:
          fs.writeFileSync(path.join(projectPath, 'README.md'),
            `# ${projectName}\n\nCreated with AeroNull Project Runner v7.0\n`);
      }
      console.log(`\n${colors.green}[+] Project "${projectName}" berhasil dibuat!${colors.reset}\n`);
      waitForEnter();
    });
  });
}

function listCodingProjects() {
  clearScreen();
  displayHeader();
  const projects = getCodingProjects();
  if (projects.length === 0) {
    drawBox('CODING PROJECTS', ['Tidak ada project'], colors.yellow);
    waitForEnter();
    return;
  }
  const projectList = projects.map((project, index) => {
    const projectPath = path.join(CODING_DIR, project);
    const size = getDirSize(projectPath);
    return `${colors.green}${index + 1}.${colors.reset} [${formatBytes(size)}] ${project}`;
  });
  drawBox('CODING PROJECTS', projectList, colors.cyan);
  waitForEnter();
}

function editCodingProject() {
  const projects = getCodingProjects();
  if (projects.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada project untuk diedit${colors.reset}`);
    setTimeout(codingWorkspace, 1000);
    return;
  }
  const projectList = projects.map((project, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${project}`;
  });
  console.log('');
  drawBox('PILIH PROJECT', projectList, colors.cyan);
  console.log('');
  rl.question(`${colors.cyan}> Pilih nomor project (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      codingWorkspace();
      return;
    }
    if (index >= 0 && index < projects.length) {
      const projectPath = path.join(CODING_DIR, projects[index]);
      try {
        const output = execSync(`find "${projectPath}" -type f`, { encoding: 'utf8' });
        const files = output.split('\n').filter(f => f.trim());
        if (files.length === 0) {
          console.log(`${colors.yellow}[!] Project kosong${colors.reset}`);
          setTimeout(codingWorkspace, 1000);
          return;
        }
        const fileList = files.map((file, idx) => {
          const relativePath = path.relative(projectPath, file);
          const ext = path.extname(file);
          let icon = '[FILE]';
          if (ext === '.js') icon = '[JS]';
          else if (ext === '.py') icon = '[PY]';
          else if (ext === '.sh') icon = '[SH]';
          else if (ext === '.html') icon = '[HTML]';
          else if (ext === '.css') icon = '[CSS]';
          else if (ext === '.json') icon = '[JSON]';
          return `${colors.green}${idx + 1}.${colors.reset} ${icon} ${relativePath}`;
        });
        console.log('');
        drawBox('PILIH FILE', fileList, colors.yellow);
        console.log('');
        rl.question(`${colors.cyan}> Pilih nomor file (0 untuk batal): ${colors.reset}`, (fileChoice) => {
          const fileIndex = parseInt(fileChoice) - 1;
          if (fileChoice === '0') {
            codingWorkspace();
            return;
          }
          if (fileIndex >= 0 && fileIndex < files.length) {
            const editor = process.env.EDITOR || 'nano';
            const child = spawn(editor, [files[fileIndex]], { stdio: 'inherit' });
            child.on('close', () => {
              console.log(`\n${colors.green}[+] File tersimpan${colors.reset}\n`);
              codingWorkspace();
            });
          } else {
            console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
            setTimeout(codingWorkspace, 1000);
          }
        });
      } catch (error) {
        console.log(`${colors.red}[X] Error: ${error.message}${colors.reset}`);
        setTimeout(codingWorkspace, 1000);
      }
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(codingWorkspace, 1000);
    }
  });
}

function runCodingProject() {
  const projects = getCodingProjects();
  if (projects.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada project untuk dijalankan${colors.reset}`);
    setTimeout(codingWorkspace, 1000);
    return;
  }
  const projectList = projects.map((project, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${project}`;
  });
  console.log('');
  drawBox('PILIH PROJECT', projectList, colors.green);
  console.log('');
  rl.question(`${colors.cyan}> Pilih nomor project (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      codingWorkspace();
      return;
    }
    if (index >= 0 && index < projects.length) {
      const projectPath = path.join(CODING_DIR, projects[index]);
      rl.question(`${colors.cyan}> Command (contoh: npm start, node index.js, python main.py): ${colors.reset}`, (command) => {
        if (!command.trim()) {
          console.log(`${colors.red}[X] Command tidak boleh kosong${colors.reset}`);
          setTimeout(codingWorkspace, 1000);
          return;
        }
        console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║ Running: ${projects[index]}${' '.repeat(38 - projects[index].length)}║${colors.reset}`);
        console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
        const child = spawn('bash', ['-c', command], { cwd: projectPath, stdio: 'inherit' });
        child.on('close', (code) => {
          console.log(`\n${colors.green}[+] Selesai dengan exit code: ${code}${colors.reset}\n`);
          waitForEnter();
        });
        child.on('error', (error) => {
          console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
          waitForEnter();
        });
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(codingWorkspace, 1000);
    }
  });
}

function deleteCodingProject() {
  const projects = getCodingProjects();
  if (projects.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada project untuk dihapus${colors.reset}`);
    setTimeout(codingWorkspace, 1000);
    return;
  }
  const projectList = projects.map((project, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${project}`;
  });
  console.log('');
  drawBox('HAPUS PROJECT', projectList, colors.red);
  console.log('');
  rl.question(`${colors.cyan}> Pilih nomor project (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      codingWorkspace();
      return;
    }
    if (index >= 0 && index < projects.length) {
      rl.question(`${colors.red}> Yakin ingin menghapus "${projects[index]}"? (y/n): ${colors.reset}`, (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          try {
            const projectPath = path.join(CODING_DIR, projects[index]);
            fs.rmSync(projectPath, { recursive: true, force: true });
            console.log(`\n${colors.green}[+] Project berhasil dihapus${colors.reset}\n`);
          } catch (error) {
            console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
          }
        }
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(codingWorkspace, 1000);
    }
  });
}

function webProjectsMenu() {
  clearScreen();
  displayHeader();
  const menuItems = [
    `${colors.green}[1]${colors.reset} Buat Web Project Baru`,
    `${colors.green}[2]${colors.reset} Lihat Web Projects`,
    `${colors.green}[3]${colors.reset} Jalankan Web Server (Port 3000)`,
    `${colors.green}[4]${colors.reset} Hapus Web Project`,
    `${colors.green}[5]${colors.reset} Kembali`
  ];
  drawBox('WEB PROJECTS - PORT 3000', menuItems, colors.cyan);
  console.log('');
  rl.question(`${colors.cyan}> Pilih opsi [1-5]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1': createWebProject(); break;
      case '2': listWebProjects(); break;
      case '3': runWebServer(); break;
      case '4': deleteWebProject(); break;
      case '5': mainMenu(); break;
      default: 
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(webProjectsMenu, 1000);
    }
  });
}

function createWebProject() {
  rl.question(`\n${colors.cyan}> Nama web project: ${colors.reset}`, (projectName) => {
    if (!projectName.trim()) {
      console.log(`${colors.red}[X] Nama project tidak boleh kosong${colors.reset}`);
      setTimeout(webProjectsMenu, 1000);
      return;
    }
    const projectPath = path.join(WEB_PROJECTS_DIR, projectName);
    if (fs.existsSync(projectPath)) {
      console.log(`${colors.red}[X] Project sudah ada!${colors.reset}`);
      setTimeout(webProjectsMenu, 1000);
      return;
    }
    const templates = [
      `${colors.green}[1]${colors.reset} Basic HTML/CSS/JS`,
      `${colors.green}[2]${colors.reset} Express.js Server`,
      `${colors.green}[3]${colors.reset} React App`,
      `${colors.green}[4]${colors.reset} Static Website`,
      `${colors.green}[5]${colors.reset} API Server`
    ];
    console.log('');
    drawBox('PILIH TEMPLATE WEB', templates, colors.yellow);
    console.log('');
    rl.question(`${colors.cyan}> Pilih template [1-5]: ${colors.reset}`, (templateChoice) => {
      fs.mkdirSync(projectPath, { recursive: true });
      switch (templateChoice) {
        case '1':
          fs.writeFileSync(path.join(projectPath, 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Welcome to ${projectName}</h1>\n    <p>AeroNull Web Project</p>\n    <button id="clickBtn">Click Me!</button>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>\n`);
          fs.writeFileSync(path.join(projectPath, 'style.css'),
            `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: 'Arial', sans-serif;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  min-height: 100vh;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\n.container {\n  text-align: center;\n  padding: 40px;\n  background: rgba(255,255,255,0.1);\n  border-radius: 20px;\n  backdrop-filter: blur(10px);\n}\n\nh1 {\n  font-size: 3rem;\n  margin-bottom: 20px;\n  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);\n}\n\np {\n  font-size: 1.5rem;\n  margin-bottom: 30px;\n}\n\nbutton {\n  background: #ff6b6b;\n  color: white;\n  border: none;\n  padding: 15px 30px;\n  font-size: 1.2rem;\n  border-radius: 50px;\n  cursor: pointer;\n  transition: all 0.3s ease;\n}\n\nbutton:hover {\n  background: #ff5252;\n  transform: translateY(-2px);\n  box-shadow: 0 10px 20px rgba(0,0,0,0.2);\n}\n`);
          fs.writeFileSync(path.join(projectPath, 'script.js'),
            `console.log('${projectName} loaded!');\n\ndocument.getElementById('clickBtn').addEventListener('click', function() {\n  this.textContent = 'Clicked!';\n  this.style.background = '#4ecdc4';\n  setTimeout(() => {\n    this.textContent = 'Click Me!';\n    this.style.background = '#ff6b6b';\n  }, 1000);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'server.js'),
            `const http = require('http');\nconst fs = require('fs');\nconst path = require('path');\n\nconst server = http.createServer((req, res) => {\n  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);\n  const ext = path.extname(filePath);\n  let contentType = 'text/html';\n\n  switch (ext) {\n    case '.css': contentType = 'text/css'; break;\n    case '.js': contentType = 'text/javascript'; break;\n    case '.json': contentType = 'application/json'; break;\n  }\n\n  fs.readFile(filePath, (err, content) => {\n    if (err) {\n      res.writeHead(404);\n      res.end('File not found');\n    } else {\n      res.writeHead(200, { 'Content-Type': contentType });\n      res.end(content);\n    }\n  });\n});\n\nconst PORT = 3000;\nserver.listen(PORT, () => {\n  console.log(\`Server running at http://localhost:\${PORT}\`);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "node server.js"\n  }\n}\n`);
          break;
        case '2':
          fs.writeFileSync(path.join(projectPath, 'server.js'),
            `const express = require('express');\nconst app = express();\nconst PORT = 3000;\n\napp.use(express.json());\napp.use(express.static('public'));\n\napp.get('/', (req, res) => {\n  res.send(\`\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <title>${projectName}</title>\n      <style>\n        body { \n          font-family: Arial; \n          background: linear-gradient(135deg, #667eea, #764ba2);\n          color: white;\n          text-align: center;\n          padding: 50px;\n        }\n        h1 { font-size: 3rem; margin-bottom: 20px; }\n        p { font-size: 1.2rem; }\n      </style>\n    </head>\n    <body>\n      <h1>${projectName}</h1>\n      <p>Express.js Server Running on Port 3000</p>\n    </body>\n    </html>\n  \`);\n});\n\napp.get('/api/info', (req, res) => {\n  res.json({\n    project: '${projectName}',\n    server: 'Express.js',\n    port: PORT,\n    status: 'running'\n  });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}\n`);
          break;
        case '3':
          fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
          fs.mkdirSync(path.join(projectPath, 'public'), { recursive: true });
          fs.writeFileSync(path.join(projectPath, 'src', 'App.js'),
            `import React, { useState } from 'react';\nimport './App.css';\n\nfunction App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className="App">\n      <header className="App-header">\n        <h1>${projectName}</h1>\n        <p>React App on Port 3000</p>\n        <div className=\"counter\">\n          <button onClick={() => setCount(count - 1)}>-</button>\n          <span>{count}</span>\n          <button onClick={() => setCount(count + 1)}>+</button>\n        </div>\n      </header>\n    </div>\n  );\n}\n\nexport default App;\n`);
          fs.writeFileSync(path.join(projectPath, 'src', 'App.css'),
            `.App {\n  text-align: center;\n}\n\n.App-header {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  font-size: calc(10px + 2vmin);\n  color: white;\n}\n\n.counter {\n  display: flex;\n  align-items: center;\n  gap: 20px;\n  margin-top: 20px;\n}\n\n.counter button {\n  background: #ff6b6b;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  font-size: 1.5rem;\n  border-radius: 10px;\n  cursor: pointer;\n}\n\n.counter span {\n  font-size: 2rem;\n  min-width: 60px;\n}\n`);
          fs.writeFileSync(path.join(projectPath, 'src', 'index.js'),
            `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);\n`);
          fs.writeFileSync(path.join(projectPath, 'public', 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>${projectName}</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "private": true,\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "react-scripts": "5.0.1"\n  },\n  "scripts": {\n    "start": "react-scripts start",\n    "build": "react-scripts build"\n  },\n  "browserslist": {\n    "production": [">0.2%", "not dead", "not op_mini all"],\n    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]\n  }\n}\n`);
          break;
        case '4':
          fs.writeFileSync(path.join(projectPath, 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${projectName} - Static Site</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { \n      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n      background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);\n      background-size: 400% 400%;\n      animation: gradient 15s ease infinite;\n      color: white;\n      min-height: 100vh;\n    }\n    @keyframes gradient {\n      0% { background-position: 0% 50%; }\n      50% { background-position: 100% 50%; }\n      100% { background-position: 0% 50%; }\n    }\n    .container { \n      max-width: 1200px; \n      margin: 0 auto; \n      padding: 40px 20px; \n      text-align: center; \n    }\n    h1 { \n      font-size: 4rem; \n      margin-bottom: 20px; \n      text-shadow: 3px 3px 6px rgba(0,0,0,0.3);\n    }\n    p { \n      font-size: 1.3rem; \n      margin-bottom: 30px; \n      line-height: 1.6;\n    }\n    .features {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n      gap: 20px;\n      margin-top: 40px;\n    }\n    .feature {\n      background: rgba(255,255,255,0.1);\n      padding: 30px;\n      border-radius: 15px;\n      backdrop-filter: blur(10px);\n    }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <h1>${projectName}</h1>\n    <p>Beautiful Static Website Created with AeroNull</p>\n    <div class="features">\n      <div class="feature">\n        <h3>🚀 Fast</h3>\n        <p>Lightning fast performance</p>\n      </div>\n      <div class="feature">\n        <h3>🎨 Beautiful</h3>\n        <p>Stunning gradient designs</p>\n      </div>\n      <div class="feature">\n        <h3>📱 Responsive</h3>\n        <p>Works on all devices</p>\n      </div>\n    </div>\n  </div>\n  <script>\n    console.log('${projectName} - Static Site Loaded');\n  </script>\n</body>\n</html>\n`);
          fs.writeFileSync(path.join(projectPath, 'server.js'),
            `const http = require('http');\nconst fs = require('fs');\nconst path = require('path');\n\nconst server = http.createServer((req, res) => {\n  const filePath = path.join(__dirname, 'index.html');\n  fs.readFile(filePath, (err, content) => {\n    if (err) {\n      res.writeHead(404);\n      res.end('File not found');\n    } else {\n      res.writeHead(200, { 'Content-Type': 'text/html' });\n      res.end(content);\n    }\n  });\n});\n\nconst PORT = 3000;\nserver.listen(PORT, () => {\n  console.log(\`Static server running at http://localhost:\${PORT}\`);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js"\n  }\n}\n`);
          break;
        case '5':
          fs.writeFileSync(path.join(projectPath, 'server.js'),
            `const express = require('express');\nconst app = express();\nconst PORT = 3000;\n\napp.use(express.json());\n\nlet users = [\n  { id: 1, name: 'John Doe', email: 'john@example.com' },\n  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }\n];\n\napp.get('/', (req, res) => {\n  res.json({ \n    message: '${projectName} API Server',\n    endpoints: [\n      'GET /api/users',\n      'POST /api/users',\n      'GET /api/users/:id',\n      'PUT /api/users/:id',\n      'DELETE /api/users/:id'\n    ]\n  });\n});\n\napp.get('/api/users', (req, res) => {\n  res.json(users);\n});\n\napp.get('/api/users/:id', (req, res) => {\n  const user = users.find(u => u.id === parseInt(req.params.id));\n  if (!user) return res.status(404).json({ error: 'User not found' });\n  res.json(user);\n});\n\napp.post('/api/users', (req, res) => {\n  const user = {\n    id: users.length + 1,\n    name: req.body.name,\n    email: req.body.email\n  };\n  users.push(user);\n  res.status(201).json(user);\n});\n\napp.put('/api/users/:id', (req, res) => {\n  const user = users.find(u => u.id === parseInt(req.params.id));\n  if (!user) return res.status(404).json({ error: 'User not found' });\n  user.name = req.body.name || user.name;\n  user.email = req.body.email || user.email;\n  res.json(user);\n});\n\napp.delete('/api/users/:id', (req, res) => {\n  const index = users.findIndex(u => u.id === parseInt(req.params.id));\n  if (index === -1) return res.status(404).json({ error: 'User not found' });\n  users.splice(index, 1);\n  res.json({ message: 'User deleted' });\n});\n\napp.listen(PORT, () => {\n  console.log(\`API Server running on port \${PORT}\`);\n});\n`);
          fs.writeFileSync(path.join(projectPath, 'package.json'),
            `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}\n`);
          break;
        default:
          fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n\nWeb Project Created with AeroNull\n`);
      }
      console.log(`\n${colors.green}[+] Web Project "${projectName}" berhasil dibuat!${colors.reset}\n`);
      waitForEnter();
    });
  });
}

function listWebProjects() {
  clearScreen();
  displayHeader();
  const projects = getWebProjects();
  if (projects.length === 0) {
    drawBox('WEB PROJECTS', ['Tidak ada web project'], colors.yellow);
    waitForEnter();
    return;
  }
  const projectList = projects.map((project, index) => {
    const projectPath = path.join(WEB_PROJECTS_DIR, project);
    const size = getDirSize(projectPath);
    return `${colors.green}${index + 1}.${colors.reset} [${formatBytes(size)}] ${project}`;
  });
  drawBox('WEB PROJECTS', projectList, colors.cyan);
  waitForEnter();
}

function runWebServer() {
  const projects = getWebProjects();
  if (projects.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada web project untuk dijalankan${colors.reset}`);
    setTimeout(webProjectsMenu, 1000);
    return;
  }
  const projectList = projects.map((project, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${project}`;
  });
  console.log('');
  drawBox('PILIH WEB PROJECT', projectList, colors.green);
  console.log('');
  rl.question(`${colors.cyan}> Pilih nomor project (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      webProjectsMenu();
      return;
    }
    if (index >= 0 && index < projects.length) {
      const projectPath = path.join(WEB_PROJECTS_DIR, projects[index]);
      console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.cyan}║ Starting Web Server: ${projects[index]}${' '.repeat(16 - projects[index].length)}║${colors.reset}`);
      console.log(`${colors.cyan}║ Port: 3000${' '.repeat(28)}║${colors.reset}`);
      console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
      console.log(`${colors.yellow}[!] Server akan berjalan di: http://localhost:3000${colors.reset}\n`);
      console.log(`${colors.yellow}[!] Tekan Ctrl+C untuk menghentikan server${colors.reset}\n`);
      const child = spawn('node', ['server.js'], { cwd: projectPath, stdio: 'inherit' });
      child.on('close', (code) => {
        console.log(`\n${colors.green}[+] Server stopped with code: ${code}${colors.reset}\n`);
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(webProjectsMenu, 1000);
    }
  });
}

function deleteWebProject() {
  const projects = getWebProjects();
  if (projects.length === 0) {
    console.log(`${colors.yellow}[!] Tidak ada web project untuk dihapus${colors.reset}`);
    setTimeout(webProjectsMenu, 1000);
    return;
  }
  const projectList = projects.map((project, index) => {
    return `${colors.green}${index + 1}.${colors.reset} ${project}`;
  });
  console.log('');
  drawBox('HAPUS WEB PROJECT', projectList, colors.red);
  console.log('');
  rl.question(`${colors.cyan}> Pilih nomor project (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      webProjectsMenu();
      return;
    }
    if (index >= 0 && index < projects.length) {
      rl.question(`${colors.red}> Yakin ingin menghapus "${projects[index]}"? (y/n): ${colors.reset}`, (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          try {
            const projectPath = path.join(WEB_PROJECTS_DIR, projects[index]);
            fs.rmSync(projectPath, { recursive: true, force: true });
            console.log(`\n${colors.green}[+] Web Project berhasil dihapus${colors.reset}\n`);
          } catch (error) {
            console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
          }
        }
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      setTimeout(webProjectsMenu, 1000);
    }
  });
}

function listScripts() {
  const scripts = getScriptFiles();
  if (scripts.length === 0) {
    drawBox('DAFTAR SCRIPT', ['Tidak ada script tersedia'], colors.yellow);
    return [];
  }
  const scriptList = scripts.map((file, index) => {
    const ext = path.extname(file);
    let icon = '[FILE]';
    if (ext === '.js') icon = '[JS]';
    else if (ext === '.sh') icon = '[SH]';
    else if (ext === '.py') icon = '[PY]';
    else if (ext === '.rb') icon = '[RB]';
    else if (ext === '.php') icon = '[PHP]';
    else if (ext === '.go') icon = '[GO]';
    else if (ext === '.zip') icon = '[ZIP]';
    else if (ext === '.txt') icon = '[TXT]';
    else if (ext === '.md') icon = '[MD]';
    return `${colors.green}${index + 1}.${colors.reset} ${icon} ${file}`;
  });
  drawBox('DAFTAR SCRIPT', scriptList, colors.magenta);
  return scripts;
}

function listExtractedFolders() {
  const folders = getExtractedFolders();
  if (folders.length === 0) {
    drawBox('FOLDER EXTRACTED', ['Tidak ada folder extracted'], colors.yellow);
    return [];
  }
  const folderList = folders.map((folder, index) => {
    const folderPath = path.join(EXTRACT_DIR, folder);
    const size = getDirSize(folderPath);
    return `${colors.green}${index + 1}.${colors.reset} [${formatBytes(size)}] ${folder}`;
  });
  drawBox('FOLDER EXTRACTED', folderList, colors.cyan);
  return folders;
}

function manageExtractedZip() {
  clearScreen();
  displayHeader();
  const folders = listExtractedFolders();
  if (folders.length === 0) {
    waitForEnter();
    return;
  }
  rl.question(`\n${colors.cyan}> Pilih folder (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      mainMenu();
      return;
    }
    if (index >= 0 && index < folders.length) {
      const folderPath = path.join(EXTRACT_DIR, folders[index]);
      showZipFolderMenu(folderPath, folders[index]);
    } else {
      console.log(`\n${colors.red}[X] Pilihan tidak valid${colors.reset}\n`);
      waitForEnter();
    }
  });
}

function showZipFolderMenu(folderPath, folderName) {
  clearScreen();
  displayHeader();
  const menuItems = [
    `${colors.green}[1]${colors.reset} Lihat Struktur File`,
    `${colors.green}[2]${colors.reset} Edit File`,
    `${colors.green}[3]${colors.reset} Jalankan Command`,
    `${colors.green}[4]${colors.reset} Hapus Folder`,
    `${colors.green}[5]${colors.reset} Kembali`
  ];
  drawBox(`KELOLA: ${folderName}`, menuItems, colors.magenta);
  console.log('');
  rl.question(`${colors.cyan}> Pilih aksi [1-5]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1': showFolderStructure(folderPath, folderName); break;
      case '2': editFileInFolder(folderPath, folderName); break;
      case '3': runCommandInFolder(folderPath, folderName); break;
      case '4': deleteFolder(folderPath, folderName); break;
      case '5': manageExtractedZip(); break;
      default:
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(() => showZipFolderMenu(folderPath, folderName), 1000);
    }
  });
}

function showFolderStructure(folderPath, folderName) {
  clearScreen();
  displayHeader();
  try {
    const output = execSync(`find "${folderPath}" -type f`, { encoding: 'utf8' });
    const files = output.split('\n').filter(f => f.trim());
    const fileList = files.slice(0, 50).map((file, index) => {
      const relativePath = path.relative(folderPath, file);
      return `${colors.green}${index + 1}.${colors.reset} ${relativePath}`;
    });
    if (files.length > 50) {
      fileList.push(`${colors.yellow}... dan ${files.length - 50} file lainnya${colors.reset}`);
    }
    drawBox(`STRUKTUR: ${folderName}`, fileList.length > 0 ? fileList : ['Folder kosong'], colors.cyan);
  } catch (error) {
    console.log(`${colors.red}[X] Gagal membaca struktur folder${colors.reset}`);
  }
  waitForEnter();
}

function editFileInFolder(folderPath, folderName) {
  try {
    const output = execSync(`find "${folderPath}" -type f`, { encoding: 'utf8' });
    const files = output.split('\n').filter(f => f.trim());
    if (files.length === 0) {
      console.log(`${colors.yellow}[!] Tidak ada file untuk diedit${colors.reset}`);
      waitForEnter();
      return;
    }
    const fileList = files.slice(0, 30).map((file, index) => {
      const relativePath = path.relative(folderPath, file);
      return `${colors.green}${index + 1}.${colors.reset} ${relativePath}`;
    });
    if (files.length > 30) {
      fileList.push(`${colors.yellow}... dan ${files.length - 30} file lainnya${colors.reset}`);
    }
    console.log('');
    drawBox('PILIH FILE UNTUK DIEDIT', fileList, colors.yellow);
    console.log('');
    rl.question(`${colors.cyan}> Pilih nomor file (0 untuk batal): ${colors.reset}`, (choice) => {
      const index = parseInt(choice) - 1;
      if (choice === '0') {
        showZipFolderMenu(folderPath, folderName);
        return;
      }
      if (index >= 0 && index < files.length) {
        const filePath = files[index];
        console.log(`\n${colors.cyan}Membuka editor...${colors.reset}\n`);
        const editor = process.env.EDITOR || 'nano';
        const child = spawn(editor, [filePath], { stdio: 'inherit' });
        child.on('close', () => {
          console.log(`\n${colors.green}[+] File tersimpan${colors.reset}\n`);
          showZipFolderMenu(folderPath, folderName);
        });
      } else {
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(() => editFileInFolder(folderPath, folderName), 1000);
      }
    });
  } catch (error) {
    console.log(`${colors.red}[X] Gagal membaca file: ${error.message}${colors.reset}`);
    waitForEnter();
  }
}

function runCommandInFolder(folderPath, folderName) {
  rl.question(`\n${colors.cyan}> Masukkan command (contoh: npm start, pm2 start, node index.js): ${colors.reset}`, (command) => {
    if (!command.trim()) {
      console.log(`${colors.red}[X] Command tidak boleh kosong${colors.reset}`);
      setTimeout(() => showZipFolderMenu(folderPath, folderName), 1000);
      return;
    }
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║ Running command in: ${folderName}${' '.repeat(18 - folderName.length)}║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
    const child = spawn('bash', ['-c', command], { cwd: folderPath, stdio: 'inherit' });
    child.on('close', (code) => {
      console.log(`\n${colors.green}[+] Command selesai dengan exit code: ${code}${colors.reset}\n`);
      rl.question(`\n${colors.cyan}> Kembali ke menu? (y/n): ${colors.reset}`, (answer) => {
        if (answer.toLowerCase() === 'y') {
          showZipFolderMenu(folderPath, folderName);
        } else {
          mainMenu();
        }
      });
    });
    child.on('error', (error) => {
      console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
      setTimeout(() => showZipFolderMenu(folderPath, folderName), 2000);
    });
  });
}

function deleteFolder(folderPath, folderName) {
  rl.question(`\n${colors.red}> Yakin ingin menghapus folder "${folderName}"? (y/n): ${colors.reset}`, (answer) => {
    if (answer.toLowerCase() === 'y') {
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`\n${colors.green}[+] Folder berhasil dihapus${colors.reset}\n`);
      } catch (error) {
        console.log(`\n${colors.red}[X] Gagal menghapus folder: ${error.message}${colors.reset}\n`);
      }
      waitForEnter();
    } else {
      showZipFolderMenu(folderPath, folderName);
    }
  });
}

function runScript(scriptPath, args = '') {
  return new Promise((resolve) => {
    const ext = path.extname(scriptPath).toLowerCase();
    let cmd, cmdArgs;
    if (ext === '.js') {
      cmd = 'node';
      cmdArgs = [scriptPath];
    } else if (ext === '.sh') {
      fs.chmodSync(scriptPath, '755');
      cmd = 'bash';
      cmdArgs = [scriptPath];
    } else if (ext === '.py') {
      cmd = 'python';
      cmdArgs = [scriptPath];
    } else if (ext === '.rb') {
      cmd = 'ruby';
      cmdArgs = [scriptPath];
    } else if (ext === '.php') {
      cmd = 'php';
      cmdArgs = [scriptPath];
    } else if (ext === '.go') {
      cmd = 'go';
      cmdArgs = ['run', scriptPath];
    } else {
      console.log(`${colors.red}[X] Format file tidak didukung!${colors.reset}`);
      resolve();
      return;
    }
    if (args.trim()) {
      cmdArgs = cmdArgs.concat(args.trim().split(' '));
    }
    const historyEntry = `${new Date().toISOString()} - ${path.basename(scriptPath)} ${args}\n`;
    fs.appendFileSync(HISTORY_FILE, historyEntry);
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║ Running: ${path.basename(scriptPath)}${' '.repeat(30 - path.basename(scriptPath).length)}║${colors.reset}`);
    if (args.trim()) {
      console.log(`${colors.cyan}║ Args: ${args.substring(0, 32)}${' '.repeat(Math.max(0, 33 - args.length))}║${colors.reset}`);
    }
    console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}[+] Script selesai dijalankan${colors.reset}\n`);
      } else {
        console.log(`\n${colors.yellow}[!] Script selesai dengan exit code: ${code}${colors.reset}\n`);
      }
      resolve();
    });
    child.on('error', (error) => {
      console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
      resolve();
    });
  });
}

function runAnyCommand() {
  rl.question(`\n${colors.cyan}> Masukkan command (support: npm, pm2, yarn, git, dll): ${colors.reset}`, (command) => {
    if (!command.trim()) {
      console.log(`${colors.red}[X] Command tidak boleh kosong${colors.reset}`);
      waitForEnter();
      return;
    }
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║ Executing command...                  ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
    const child = spawn('bash', ['-c', command], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}[+] Command selesai dijalankan${colors.reset}\n`);
      } else {
        console.log(`\n${colors.yellow}[!] Command selesai dengan exit code: ${code}${colors.reset}\n`);
      }
      waitForEnter();
    });
    child.on('error', (error) => {
      console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
      waitForEnter();
    });
  });
}

function runExtractedProject() {
  clearScreen();
  displayHeader();
  const folders = listExtractedFolders();
  if (folders.length === 0) {
    waitForEnter();
    return;
  }
  rl.question(`\n${colors.cyan}> Pilih nomor folder (0 untuk batal): ${colors.reset}`, async (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      mainMenu();
      return;
    }
    if (index >= 0 && index < folders.length) {
      const projectPath = path.join(EXTRACT_DIR, folders[index]);
      rl.question(`\n${colors.cyan}> Masukkan command (contoh: npm start, pm2 start, node index.js): ${colors.reset}`, async (command) => {
        if (!command.trim()) {
          console.log(`${colors.red}[X] Command tidak boleh kosong${colors.reset}`);
          waitForEnter();
          return;
        }
        console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║ Running project: ${folders[index]}${' '.repeat(22 - folders[index].length)}║${colors.reset}`);
        console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);
        const child = spawn('bash', ['-c', command], { cwd: projectPath, stdio: 'inherit' });
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`\n${colors.green}[+] Project selesai dijalankan${colors.reset}\n`);
          } else {
            console.log(`\n${colors.yellow}[!] Project selesai dengan exit code: ${code}${colors.reset}\n`);
          }
          waitForEnter();
        });
        child.on('error', (error) => {
          console.log(`\n${colors.red}[X] Error: ${error.message}${colors.reset}\n`);
          waitForEnter();
        });
      });
    } else {
      console.log(`\n${colors.red}[X] Pilihan tidak valid${colors.reset}\n`);
      waitForEnter();
    }
  });
}

function addScript() {
  rl.question(`\n${colors.cyan}> Masukkan nama file script (contoh: script.js): ${colors.reset}`, (filename) => {
    const scriptPath = path.join(SCRIPT_DIR, filename);
    if (fs.existsSync(scriptPath)) {
      console.log(`${colors.red}[!] File sudah ada!${colors.reset}`);
      waitForEnter();
      return;
    }
    console.log(`\n${colors.yellow}Masukkan kode script (ketik END pada baris baru untuk selesai):${colors.reset}\n`);
    let scriptContent = '';
    const lineHandler = (line) => {
      if (line.trim() === 'END') {
        fs.writeFileSync(scriptPath, scriptContent);
        console.log(`\n${colors.green}[+] Script berhasil disimpan: ${filename}${colors.reset}\n`);
        rl.removeListener('line', lineHandler);
        waitForEnter();
      } else {
        scriptContent += line + '\n';
      }
    };
    rl.on('line', lineHandler);
  });
}

function deleteScript(scripts) {
  if (scripts.length === 0) {
    console.log(`${colors.red}[!] Tidak ada script untuk dihapus${colors.reset}`);
    waitForEnter();
    return;
  }
  rl.question(`\n${colors.cyan}> Pilih nomor script yang akan dihapus (0 untuk batal): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      mainMenu();
      return;
    }
    if (index >= 0 && index < scripts.length) {
      const scriptPath = path.join(SCRIPT_DIR, scripts[index]);
      fs.unlinkSync(scriptPath);
      console.log(`\n${colors.green}[+] Script berhasil dihapus${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}[X] Pilihan tidak valid${colors.reset}\n`);
    }
    waitForEnter();
  });
}

function findZipFiles() {
  let allZips = [];
  for (const downloadPath of DOWNLOAD_PATHS) {
    try {
      if (fs.existsSync(downloadPath)) {
        const files = fs.readdirSync(downloadPath);
        const zips = files
          .filter(f => path.extname(f).toLowerCase() === '.zip')
          .map(f => ({
            name: f,
            path: path.join(downloadPath, f),
            location: downloadPath
          }));
        allZips = allZips.concat(zips);
      }
    } catch (error) {
      continue;
    }
  }
  return allZips;
}

function showZipStructureMenu(zipFiles) {
  clearScreen();
  displayHeader();
  const zipList = zipFiles.map((zip, index) => {
    const location = zip.location ? (zip.location.includes('Telegram') ? '[TG]' : '[DL]') : '[VPS]';
    return `${colors.green}${index + 1}.${colors.reset} ${location} ${zip.name || zip.host}`;
  });
  drawBox('PILIH ZIP UNTUK MELIHAT ISI', zipList, colors.cyan);
  rl.question(`\n${colors.cyan}> Pilih nomor ZIP (0 untuk kembali): ${colors.reset}`, (choice) => {
    const index = parseInt(choice) - 1;
    if (choice === '0') {
      extractZipFromDownload();
      return;
    }
    if (index >= 0 && index < zipFiles.length) {
      if (zipFiles[index].path) {
        const zipPath = zipFiles[index].path;
        showZipContents(zipPath, zipFiles);
      } else {
        console.log(`${colors.yellow}[!] Fitur view structure untuk VPS sedang dikembangkan${colors.reset}`);
        waitForEnter();
      }
    } else {
      console.log(`\n${colors.red}[X] Pilihan tidak valid${colors.reset}\n`);
      setTimeout(() => showZipStructureMenu(zipFiles), 1000);
    }
  });
}

function showZipContents(zipPath, zipFiles) {
  clearScreen();
  displayHeader();
  console.log(`${colors.cyan}Membaca struktur ZIP...${colors.reset}\n`);
  const structure = getZipStructure(zipPath);
  if (structure.length === 0) {
    console.log(`${colors.red}[X] Gagal membaca struktur ZIP${colors.reset}\n`);
    waitForEnter();
    return;
  }
  const structureList = structure.slice(0, 40).map((file, index) => {
    const isDir = file.endsWith('/');
    const icon = isDir ? '[DIR]' : '[FILE]';
    const color = isDir ? colors.yellow : colors.white;
    return `${color}${icon}${colors.reset} ${file}`;
  });
  if (structure.length > 40) {
    structureList.push(`${colors.yellow}... dan ${structure.length - 40} item lainnya${colors.reset}`);
  }
  drawBox(`STRUKTUR: ${path.basename(zipPath)}`, structureList, colors.magenta);
  rl.question(`\n${colors.cyan}> Tekan ENTER untuk kembali...${colors.reset}`, () => {
    showZipStructureMenu(zipFiles);
  });
}

function storageCleanupMenu() {
  clearScreen();
  displayHeader();
  const cacheSize = getDirSize(CACHE_DIR);
  const debugSize = getDirSize(DEBUG_DIR);
  const historySize = fs.existsSync(HISTORY_FILE) ? fs.statSync(HISTORY_FILE).size : 0;
  const storage = getStorageInfo();
  const infoItems = [
    `${colors.cyan}Total Storage:${colors.reset} ${storage.total}`,
    `${colors.cyan}Terpakai:${colors.reset} ${storage.used} (${storage.percent})`,
    `${colors.cyan}Tersedia:${colors.reset} ${storage.available}`,
    '',
    `${colors.yellow}Cache:${colors.reset} ${formatBytes(cacheSize)}`,
    `${colors.yellow}Debug:${colors.reset} ${formatBytes(debugSize)}`,
    `${colors.yellow}History:${colors.reset} ${formatBytes(historySize)}`
  ];
  drawBox('INFO STORAGE', infoItems, colors.cyan);
  const cleanupItems = [
    `${colors.green}[1]${colors.reset} Hapus Cache`,
    `${colors.green}[2]${colors.reset} Hapus Debug`,
    `${colors.green}[3]${colors.reset} Hapus History`,
    `${colors.green}[4]${colors.reset} Hapus Semua`,
    `${colors.green}[5]${colors.reset} Kembali ke Menu`
  ];
  console.log('');
  drawBox('CLEANUP OPTIONS', cleanupItems, colors.blue);
  console.log('');
  rl.question(`${colors.cyan}> Pilih opsi [1-5]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1': deleteDirectory(CACHE_DIR, 'Cache'); break;
      case '2': deleteDirectory(DEBUG_DIR, 'Debug'); break;
      case '3': deleteFile(HISTORY_FILE, 'History'); break;
      case '4':
        deleteDirectory(CACHE_DIR, 'Cache');
        deleteDirectory(DEBUG_DIR, 'Debug');
        deleteFile(HISTORY_FILE, 'History');
        console.log(`\n${colors.green}[+] Semua data berhasil dihapus${colors.reset}\n`);
        waitForEnter();
        break;
      case '5': mainMenu(); break;
      default:
        console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
        setTimeout(() => storageCleanupMenu(), 1000);
    }
  });
}

function deleteDirectory(dirPath, name) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`\n${colors.green}[+] ${name} berhasil dihapus${colors.reset}\n`);
    } else {
      console.log(`\n${colors.yellow}[!] ${name} sudah kosong${colors.reset}\n`);
    }
    waitForEnter();
  } catch (error) {
    console.log(`\n${colors.red}[X] Gagal menghapus ${name}: ${error.message}${colors.reset}\n`);
    waitForEnter();
  }
}

function deleteFile(filePath, name) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`\n${colors.green}[+] ${name} berhasil dihapus${colors.reset}\n`);
    } else {
      console.log(`\n${colors.yellow}[!] ${name} tidak ada${colors.reset}\n`);
    }
    waitForEnter();
  } catch (error) {
    console.log(`\n${colors.red}[X] Gagal menghapus ${name}: ${error.message}${colors.reset}\n`);
    waitForEnter();
  }
}

function waitForEnter() {
  rl.question(`\n${colors.cyan}> Tekan ENTER untuk kembali ke menu...${colors.reset}`, () => {
    mainMenu();
  });
}

async function handleRunScript(scriptsToRun) {
  if (scriptsToRun.length === 0) {
    waitForEnter();
    return;
  }
  rl.question(`\n${colors.cyan}> Pilih nomor script untuk dijalankan (0 untuk batal): ${colors.reset}`, async (num) => {
    const index = parseInt(num) - 1;
    if (num === '0') {
      mainMenu();
      return;
    }
    if (index >= 0 && index < scriptsToRun.length) {
      const scriptPath = path.join(SCRIPT_DIR, scriptsToRun[index]);
      rl.question(`${colors.cyan}> Masukkan arguments (kosongkan jika tidak perlu): ${colors.reset}`, async (args) => {
        await runScript(scriptPath, args);
        waitForEnter();
      });
    } else {
      console.log(`${colors.red}[X] Pilihan tidak valid${colors.reset}`);
      waitForEnter();
    }
  });
}

function mainMenu() {
  displayMenu();
  rl.question(`${colors.cyan}> Pilih menu [0-13]: ${colors.reset}`, (choice) => {
    switch (choice) {
      case '1':
        clearScreen();
        displayHeader();
        listScripts();
        waitForEnter();
        break;
      case '2':
        clearScreen();
        displayHeader();
        const scriptsToRun = listScripts();
        handleRunScript(scriptsToRun);
        break;
      case '3': addScript(); break;
      case '4':
        clearScreen();
        displayHeader();
        const scriptsToDelete = listScripts();
        deleteScript(scriptsToDelete);
        break;
      case '5':
        clearScreen();
        displayHeader();
        extractZipFromDownload();
        break;
      case '6': manageExtractedZip(); break;
      case '7': runExtractedProject(); break;
      case '8': codingWorkspace(); break;
      case '9': webProjectsMenu(); break;
      case '10': vpsManagerMenu(); break;
      case '11': runAnyCommand(); break;
      case '12': storageCleanupMenu(); break;
      case '13': showAbout(); break;
      case '0':
        clearScreen();
        console.log('');
        console.log(gradient('   ╔════════════════════════════════════════════════════════════════╗'));
        console.log(gradient('   ║                                                                ║'));
        console.log(gradient('   ║              Terima kasih telah menggunakan                    ║'));
        console.log(gradient('   ║                AERONULL PROJECT RUNNER v7.0                    ║'));
        console.log(gradient('   ║                                                                ║'));
        console.log(gradient('   ║                   Sampai jumpa lagi!                           ║'));
        console.log(gradient('   ║                                                                ║'));
        console.log(gradient('   ╚════════════════════════════════════════════════════════════════╝'));
        console.log('');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log(`${colors.red}[X] Pilihan tidak valid!${colors.reset}`);
        setTimeout(mainMenu, 1000);
    }
  });
}

function showStartupAnimation() {
  clearScreen();
  const frames = [
    `${colors.cyan}[          ]${colors.reset} Initializing...`,
    `${colors.cyan}[==        ]${colors.reset} Loading modules...`,
    `${colors.cyan}[====      ]${colors.reset} Setting up directories...`,
    `${colors.cyan}[======    ]${colors.reset} Checking dependencies...`,
    `${colors.cyan}[========  ]${colors.reset} Preparing workspace...`,
    `${colors.cyan}[==========]${colors.reset} Ready!`
  ];
  let frameIndex = 0;
  const interval = setInterval(() => {
    process.stdout.write('\r' + frames[frameIndex]);
    frameIndex++;
    if (frameIndex >= frames.length) {
      clearInterval(interval);
      setTimeout(() => {
        console.log('\n');
        createScriptDir();
        mainMenu();
      }, 500);
    }
  }, 200);
}

console.log('');
console.log(gradient('   ╔════════════════════════════════════════════════════════════════╗'));
console.log(gradient('   ║                                                                ║'));
console.log(gradient('   ║             Memulai AeroNull Project Runner...                 ║'));
console.log(gradient('   ║                                                                ║'));
console.log(gradient('   ╚════════════════════════════════════════════════════════════════╝'));
console.log('');

setTimeout(() => {
  showStartupAnimation();
}, 1000);
