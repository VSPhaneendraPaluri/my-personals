// Execution backends. Production uses Compiler Explorer (godbolt.org); the local
// g++ backend exists only so the question templates can be unit-tested offline.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const GODBOLT = (process.env.GODBOLT_URL || 'https://godbolt.org').replace(/\/$/, '');
const UA = 'cpp-quiz/1.0 (+https://github.com/ - educational quiz)';

class InfraError extends Error {}

const text = (v) => (Array.isArray(v) ? v.map((x) => x.text ?? '').join('\n') : String(v ?? ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Limit concurrent requests and space them out a little: be polite to a free public service.
class Gate {
  constructor(max, gapMs) { this.max = max; this.gap = gapMs; this.active = 0; this.queue = []; this.last = 0; }
  async run(fn) {
    if (this.active >= this.max) await new Promise((r) => this.queue.push(r));
    this.active++;
    try {
      const wait = this.last + this.gap - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

class GodboltBackend {
  constructor() {
    this.gate = new Gate(Number(process.env.GODBOLT_CONCURRENCY || 2), Number(process.env.GODBOLT_GAP_MS || 250));
    this.compiler = null;
  }

  async #fetchJson(url, init, attempts = 3) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(40000) });
        if (res.status === 429 || res.status >= 500) throw new InfraError(`godbolt answered HTTP ${res.status}`);
        if (!res.ok) throw new InfraError(`godbolt answered HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e instanceof InfraError ? e : new InfraError(`cannot reach godbolt: ${e.message}`);
        await sleep(600 * 2 ** i);
      }
    }
    throw lastErr;
  }

  // Choose the newest released GCC that Compiler Explorer offers (override with COMPILER_ID).
  async resolveCompiler() {
    if (this.compiler) return this.compiler;
    const list = await this.gate.run(() =>
      this.#fetchJson(`${GODBOLT}/api/compilers/c++?fields=id,name,semver`, { headers: { Accept: 'application/json', 'User-Agent': UA } }));
    const forced = process.env.COMPILER_ID;
    let pick;
    if (forced) pick = list.find((c) => c.id === forced) || { id: forced, name: forced };
    else {
      const gcc = list
        .map((c) => ({ ...c, m: /^x86-64 gcc (\d+)\.(\d+)(?:\.(\d+))?$/.exec(c.name || '') }))
        .filter((c) => c.m)
        .sort((a, b) => b.m[1] - a.m[1] || b.m[2] - a.m[2] || (b.m[3] || 0) - (a.m[3] || 0));
      if (!gcc.length) throw new InfraError('no x86-64 gcc found on Compiler Explorer');
      pick = gcc[0];
    }
    const major = Number((/gcc (\d+)/.exec(pick.name || '') || [])[1] || process.env.COMPILER_MAJOR || 14);
    this.compiler = { id: pick.id, name: pick.name || pick.id, major };
    return this.compiler;
  }

  async run(source, args) {
    const c = await this.resolveCompiler();
    const body = {
      source,
      compiler: c.id,
      lang: 'c++',
      options: {
        userArguments: args,
        executeParameters: { args: [], stdin: '' },
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
        tools: [],
        libraries: [],
      },
      allowStoreCodeDebug: true,
    };
    const j = await this.gate.run(() =>
      this.#fetchJson(`${GODBOLT}/api/compiler/${encodeURIComponent(c.id)}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
        body: JSON.stringify(body),
      }));
    const build = j.buildResult || null;
    const built = build ? build.code === 0 : j.code === 0;
    const ran = j.didExecute === true && !j.timedOut;
    return {
      built, ran,
      exit: ran ? j.code : null,
      stdout: text(j.stdout),
      stderr: [build ? text(build.stderr) : '', text(j.stderr)].filter(Boolean).join('\n'),
      timedOut: !!j.timedOut,
    };
  }

  shareLink(code, args) {
    const c = this.compiler;
    const state = {
      sessions: [{
        id: 1, language: 'c++', source: code, compilers: [],
        executors: [{ compiler: { id: c.id, libs: [], options: args }, stdinVisible: false, argsVisible: false, compilerOutShown: true, wrap: false }],
      }],
    };
    return `${GODBOLT}/clientstate/${encodeURIComponent(Buffer.from(JSON.stringify(state)).toString('base64'))}`;
  }
}

// Offline stand-in used by the template test-suite (VERIFY_BACKEND=local).
class LocalBackend {
  async resolveCompiler() {
    if (this.compiler) return this.compiler;
    const out = await new Promise((resolve) => {
      const p = spawn(process.env.GXX || 'g++', ['--version']);
      let s = ''; p.stdout.on('data', (d) => (s += d)); p.on('close', () => resolve(s)); p.on('error', () => resolve(''));
    });
    const m = /(\d+)\.\d+\.\d+/.exec(out.split('\n')[0] || '');
    this.compiler = { id: 'local-gxx', name: `g++ ${m ? m[0] : '?'} (local)`, major: m ? Number(m[1]) : 13 };
    return this.compiler;
  }

  async run(source, args) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cppq-'));
    try {
      await fs.writeFile(path.join(dir, 'main.cpp'), source);
      const cc = await exec(process.env.GXX || 'g++', [...args.split(/\s+/).filter(Boolean), 'main.cpp', '-o', 'a.out'], dir, 90000);
      if (cc.code !== 0) return { built: false, ran: false, exit: null, stdout: '', stderr: cc.stderr };
      const r = await exec(path.join(dir, 'a.out'), [], dir, 5000);
      return { built: true, ran: !r.timedOut, exit: r.code, stdout: r.stdout, stderr: r.stderr, timedOut: r.timedOut };
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  shareLink() { return null; }
}

function exec(cmd, args, cwd, timeout) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let stdout = '', stderr = '', timedOut = false;
    const t = setTimeout(() => { timedOut = true; p.kill('SIGKILL'); }, timeout);
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e) => { clearTimeout(t); resolve({ code: -1, stdout, stderr: String(e), timedOut }); });
    p.on('close', (code) => { clearTimeout(t); resolve({ code, stdout, stderr, timedOut }); });
  });
}

function createBackend() {
  return process.env.VERIFY_BACKEND === 'local' ? new LocalBackend() : new GodboltBackend();
}

module.exports = { createBackend, InfraError, GODBOLT };
