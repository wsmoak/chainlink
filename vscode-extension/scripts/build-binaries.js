#!/usr/bin/env node
/**
 * Build script for chainlink binaries.
 * Compiles Windows and Linux binaries from Rust source and copies to bin/.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CHAINLINK_DIR = path.join(ROOT_DIR, 'chainlink');
const BIN_DIR = path.join(__dirname, '..', 'bin');

// Ensure bin directory exists
if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

function run(cmd, opts = {}) {
    console.log(`> ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', ...opts });
        return true;
    } catch (error) {
        console.error(`Command failed: ${cmd}`);
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

function main() {
    console.log('Building chainlink binaries from source...');
    console.log(`Chainlink source: ${CHAINLINK_DIR}`);
    console.log(`Output directory: ${BIN_DIR}`);

    let windowsOk = false;
    let linuxOk = false;

    if (process.platform === 'win32') {
        windowsOk = buildWindows();
        linuxOk = buildLinux();
    } else if (process.platform === 'linux') {
        linuxOk = buildLinux();
        console.log('\nNote: Cross-compiling for Windows not configured.');
    } else if (process.platform === 'darwin') {
        console.log('macOS build not yet supported.');
        process.exit(1);
    }

    console.log('\n=== Build Summary ===');
    console.log(`Windows: ${windowsOk ? '✓' : '✗'}`);
    console.log(`Linux:   ${linuxOk ? '✓' : '✗'}`);

    if (!windowsOk && !linuxOk) {
        console.error('\nNo binaries were built successfully.');
        process.exit(1);
    }
}

main();
