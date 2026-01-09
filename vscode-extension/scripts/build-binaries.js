#!/usr/bin/env node
/**
 * Build script for chainlink binaries.
 * Compiles Windows, Linux, and macOS binaries from Rust source and copies to bin/.
 * Uses Docker with macos-cross-compiler for cross-compilation to macOS.
 * Requires: Docker, WSL (for Linux on Windows)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CHAINLINK_DIR = path.join(ROOT_DIR, 'chainlink');
const BIN_DIR = path.join(__dirname, '..', 'bin');

// Add common tool directories to PATH for child processes
const extraPaths = process.platform === 'win32'
    ? [
        path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links'),
        path.join(os.homedir(), '.cargo', 'bin'),
    ]
    : [
        path.join(os.homedir(), '.cargo', 'bin'),
        '/usr/local/bin',
    ];

const pathSeparator = process.platform === 'win32' ? ';' : ':';
const enhancedPath = [...extraPaths, process.env.PATH].join(pathSeparator);
const enhancedEnv = { ...process.env, PATH: enhancedPath };

// Ensure bin directory exists
if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

function run(cmd, opts = {}) {
    console.log(`> ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', env: enhancedEnv, ...opts });
        return true;
    } catch (error) {
        console.error(`Command failed: ${cmd}`);
        return false;
    }
}

function checkCommand(cmd) {
    try {
        // zig uses 'version' subcommand, others use '--version'
        const versionArg = cmd === 'zig' ? 'version' : '--version';
        execSync(`${cmd} ${versionArg}`, { stdio: 'pipe', env: enhancedEnv, shell: true });
        return true;
    } catch {
        return false;
    }
}

function buildWindows() {
    console.log('\n=== Building Windows binary ===');
    const success = run('cargo build --release', { cwd: CHAINLINK_DIR });
    if (success) {
        const src = path.join(CHAINLINK_DIR, 'target', 'release', 'chainlink.exe');
        const dest = path.join(BIN_DIR, 'chainlink-win.exe');
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied: ${dest}`);
            return true;
        }
    }
    return false;
}

function buildLinux() {
    console.log('\n=== Building Linux binary ===');

    if (process.platform === 'win32') {
        // Build via WSL
        const wslCmd = 'wsl -d FedoraLinux-42 -- bash -c "source ~/.cargo/env && cd /mnt/c/Users/texas/chainlink/chainlink/chainlink && cargo build --release"';
        const success = run(wslCmd);
        if (success) {
            const src = path.join(CHAINLINK_DIR, 'target', 'release', 'chainlink');
            const dest = path.join(BIN_DIR, 'chainlink-linux');
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                console.log(`Copied: ${dest}`);
                run('wsl -d FedoraLinux-42 -- bash -c "chmod +x /mnt/c/Users/texas/chainlink/chainlink/vscode-extension/bin/chainlink-linux"');
                return true;
            }
        }
        return false;
    } else {
        // Native Linux build
        const success = run('cargo build --release', { cwd: CHAINLINK_DIR });
        if (success) {
            const src = path.join(CHAINLINK_DIR, 'target', 'release', 'chainlink');
            const dest = path.join(BIN_DIR, 'chainlink-linux');
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                fs.chmodSync(dest, 0o755);
                console.log(`Copied: ${dest}`);
                return true;
            }
        }
        return false;
    }
}

function buildMacOS() {
    console.log('\n=== Building macOS binaries (via Docker cross-compilation) ===');

    // Check if Docker is available
    if (!checkCommand('docker')) {
        console.log('Docker not found. Install from: https://www.docker.com/');
        return false;
    }

    const DOCKER_IMAGE = 'ghcr.io/shepherdjerred/macos-cross-compiler:latest';

    // Convert Windows path to Docker-compatible path
    const dockerWorkspace = process.platform === 'win32'
        ? ROOT_DIR.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, letter) => `/${letter.toLowerCase()}`)
        : ROOT_DIR;

    let x64Ok = false;
    let arm64Ok = false;

    // Build for aarch64 (Apple Silicon M1/M2/M3)
    console.log('\n--- Building for aarch64-apple-darwin ---');
    const arm64Cmd = `docker run --platform=linux/amd64 -v "${dockerWorkspace}:/workspace" --rm ${DOCKER_IMAGE} bash -c "cd /workspace/chainlink && export CC=aarch64-apple-darwin24-gcc && export AR=aarch64-apple-darwin24-ar && export CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER=aarch64-apple-darwin24-gcc && cargo build --release --target aarch64-apple-darwin"`;
    const arm64Success = run(arm64Cmd);
    if (arm64Success) {
        const src = path.join(CHAINLINK_DIR, 'target', 'aarch64-apple-darwin', 'release', 'chainlink');
        const dest = path.join(BIN_DIR, 'chainlink-darwin-arm64');
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied: ${dest}`);
            arm64Ok = true;
        }
    }

    // Build for x86_64 (Intel Macs)
    console.log('\n--- Building for x86_64-apple-darwin ---');
    const x64Cmd = `docker run --platform=linux/amd64 -v "${dockerWorkspace}:/workspace" --rm ${DOCKER_IMAGE} bash -c "cd /workspace/chainlink && export CC=x86_64-apple-darwin24-gcc && export AR=x86_64-apple-darwin24-ar && export CARGO_TARGET_X86_64_APPLE_DARWIN_LINKER=x86_64-apple-darwin24-gcc && cargo build --release --target x86_64-apple-darwin"`;
    const x64Success = run(x64Cmd);
    if (x64Success) {
        const src = path.join(CHAINLINK_DIR, 'target', 'x86_64-apple-darwin', 'release', 'chainlink');
        const dest = path.join(BIN_DIR, 'chainlink-darwin');
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied: ${dest}`);
            x64Ok = true;
        }
    }

    return x64Ok || arm64Ok;
}

function main() {
    console.log('Building chainlink binaries from source...');
    console.log(`Chainlink source: ${CHAINLINK_DIR}`);
    console.log(`Output directory: ${BIN_DIR}`);

    let windowsOk = false;
    let linuxOk = false;
    let macosOk = false;

    if (process.platform === 'win32') {
        windowsOk = buildWindows();
        linuxOk = buildLinux();
        macosOk = buildMacOS();
    } else if (process.platform === 'linux') {
        linuxOk = buildLinux();
        macosOk = buildMacOS();
        console.log('\nNote: Cross-compiling for Windows not configured on Linux.');
    } else if (process.platform === 'darwin') {
        // Native macOS build
        console.log('\n=== Building macOS binary (native) ===');
        const success = run('cargo build --release', { cwd: CHAINLINK_DIR });
        if (success) {
            const src = path.join(CHAINLINK_DIR, 'target', 'release', 'chainlink');
            const arch = process.arch === 'arm64' ? 'chainlink-darwin-arm64' : 'chainlink-darwin';
            const dest = path.join(BIN_DIR, arch);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                fs.chmodSync(dest, 0o755);
                console.log(`Copied: ${dest}`);
                macosOk = true;
            }
        }
        console.log('\nNote: Cross-compiling for Windows/Linux not configured on macOS.');
    }

    console.log('\n=== Build Summary ===');
    console.log(`Windows: ${windowsOk ? '✓' : '✗'}`);
    console.log(`Linux:   ${linuxOk ? '✓' : '✗'}`);
    console.log(`macOS:   ${macosOk ? '✓' : '✗'}`);

    // List binaries in bin directory
    console.log('\n=== Binaries in bin/ ===');
    const files = fs.readdirSync(BIN_DIR);
    files.forEach(f => {
        const stat = fs.statSync(path.join(BIN_DIR, f));
        console.log(`  ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    if (!windowsOk && !linuxOk && !macosOk) {
        console.error('\nNo binaries were built successfully.');
        process.exit(1);
    }
}

main();
