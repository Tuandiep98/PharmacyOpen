/* global fetch, WebSocket */
// Run after npm run build. Optionally pass a directory containing the previous dist.
import process from "node:process";
import { spawn } from "node:child_process";
import { createServer as httpServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm, stat } from "node:fs/promises";
import { resolve, join, sep, extname } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import assert from "node:assert/strict";
import { createServer } from "vite";

const cwd = process.cwd();
const baseline = process.argv[2] ? resolve(process.argv[2]) : null;
const roots = {
  after: resolve("apps/web/dist"),
  ...(baseline ? { before: baseline } : {}),
};
const chromePath =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const durationMs = 8000;
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
const server = httpServer(async (req, res) => {
  try {
    const [, build, ...parts] = new URL(
      req.url,
      "http://localhost",
    ).pathname.split("/");
    const root = roots[build];
    if (!root) {
      res.writeHead(404).end();
      return;
    }
    const path = resolve(root, parts.join("/") || "index.html");
    if (!path.startsWith(root + sep) || !(await stat(path)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
const profile = await mkdtemp(join(tmpdir(), "pharmacy-perf-"));
let chrome;
let socket;
let vite;
try {
  vite = await createServer({
    configFile: false,
    server: { hmr: false },
    appType: "custom",
  });
  const { Simulation, createInitialState, createSave, PREP_TASK_IDS } =
    await vite.ssrLoadModule("/packages/simulation/src/index.ts");
  const fixtures = {};
  for (const type of ["player", "npc"]) {
    const s = createInitialState(42);
    s.money = 10_000;
    s.dayStart.money = 10_000;
    s.prep.done = [...PREP_TASK_IDS];
    const sim = new Simulation(s);
    if (type === "npc") {
      for (const command of [
        { type: "hire", candidateId: "binh" },
        {
          type: "setShifts",
          workerId: "w-binh",
          shifts: ["morning", "afternoon"],
        },
        { type: "assignCounter", workerId: "w-binh", counterId: "counter-1" },
      ])
        if (!sim.dispatch(command).ok)
          throw new Error(
            `Fixture command rejected: ${JSON.stringify(command)}`,
          );
    }
    for (let i = 0; i < 220; i++) sim.step();
    fixtures[type] = createSave(sim.snapshot, 0);
  }
  await vite.close();
  vite = null;
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(4189, "127.0.0.1", ok);
  });
  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=9237",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let target;
  for (let i = 0; i < 100; i++) {
    try {
      target = (
        await (await fetch("http://127.0.0.1:9237/json/list")).json()
      ).find((t) => t.type === "page");
      if (target) break;
    } catch {
      /* Startup. */
    }
    await delay(100);
  }
  if (!target) throw new Error("Chrome did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    socket.addEventListener("open", ok);
    socket.addEventListener("error", fail);
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        if (message.error)
          request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
      }
    }
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const key = ++id;
      pending.set(key, { resolve, reject });
      socket.send(JSON.stringify({ id: key, method, params }));
    });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails)
      throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Performance.enable");
  await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  const metrics = async () =>
    Object.fromEntries(
      (await send("Performance.getMetrics")).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
  const click = (text) =>
    evaluate(
      `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b) throw new Error('Missing button: '+${JSON.stringify(text)}); b.click(); })()`,
    );
  const bridgeExpression = `(() => { const queue = [window.__perfRoot.current]; while(queue.length) { const n = queue.shift(); if(n.memoizedProps?.value?.getVersion) return n.memoizedProps.value; if(n.child) queue.push(n.child); if(n.sibling) queue.push(n.sibling); } throw new Error('Bridge not found'); })()`;
  const records = [];
  const assertions = [];
  const cases = [
    ["player-store", "player", "store", false, false],
    ["npc-store", "npc", "store", false, false],
    ["npc-inventory-mobile", "npc", "inventory", false, false],
    ["player-paused", "player", "store", true, false],
    ["player-store-repeat", "player", "store", false, false],
    ["player-reduced-effects", "player", "store", false, true],
  ];
  let injected;
  for (const build of Object.keys(roots).reverse()) {
    for (const [name, type, tab, pause, reduced] of cases) {
      if (reduced && build === "before") continue;
      if (injected)
        await send("Page.removeScriptToEvaluateOnNewDocument", {
          identifier: injected,
        });
      const source = `
        localStorage.clear();
        const save = ${JSON.stringify(fixtures[type])}; save.savedAtWallMs = Date.now();
        localStorage.setItem('bo-cong-anh.save.a', JSON.stringify(save));
        localStorage.setItem('idle-pharmacy.welcome.v1','1');
        localStorage.setItem('idle-pharmacy.settings.v1',JSON.stringify({sound:false,reducedEffects:${reduced}}));
        window.__audit={commits:0,raf:0,rect:0,offset:0,longTasks:0,longTaskMs:0};
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__={ supportsFiber:true, inject(){return 1}, onCommitFiberRoot(id,root){window.__audit.commits++;window.__perfRoot=root},onCommitFiberUnmount(){},checkDCE(){} };
        const raf=requestAnimationFrame;window.requestAnimationFrame=function(cb){window.__audit.raf++;return raf.call(window,cb)};
        const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){window.__audit.rect++;return rect.call(this)};
        for(const key of ['offsetWidth','offsetHeight']){const d=Object.getOwnPropertyDescriptor(HTMLElement.prototype,key);Object.defineProperty(HTMLElement.prototype,key,{...d,get(){window.__audit.offset++;return d.get.call(this)}})}
        new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__audit.longTasks++;window.__audit.longTaskMs+=e.duration}}).observe({type:'longtask',buffered:true});
      `;
      injected = (
        await send("Page.addScriptToEvaluateOnNewDocument", { source })
      ).identifier;
      await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      await send("Page.navigate", { url: `http://127.0.0.1:4189/${build}/` });
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`!!document.querySelector('.scene')`)) break;
        await delay(100);
      }
      if (tab === "inventory") {
        await click("Kho");
        await delay(250);
      }
      if (pause) {
        await evaluate(
          `document.querySelector('button[aria-label="Trợ giúp và cài đặt"]').click()`,
        );
        await delay(50);
        await click("Tạm dừng");
      }
      await delay(1500);
      const startState = await evaluate(
        `({tab:document.querySelector('.app').dataset.tab,paused:document.querySelector('.app').classList.contains('user-paused'),nodes:document.querySelectorAll('*').length,svgNodes:document.querySelectorAll('svg *').length,animations:document.getAnimations().filter(a=>a.playState==='running').length,sceneMounted:!!document.querySelector('.scene')})`,
      );
      await evaluate(
        `window.__audit={commits:0,raf:0,rect:0,offset:0,longTasks:0,longTaskMs:0}`,
      );
      const before = await metrics();
      await delay(durationMs);
      const after = await metrics();
      const audit = await evaluate(`window.__audit`);
      const elapsedMs = (after.Timestamp - before.Timestamp) * 1000;
      const delta = Object.fromEntries(
        [
          "TaskDuration",
          "ScriptDuration",
          "LayoutDuration",
          "RecalcStyleDuration",
          "LayoutCount",
          "RecalcStyleCount",
        ].map((k) => [k, after[k] - before[k]]),
      );
      const record = {
        build,
        name,
        elapsedMs,
        startState,
        audit,
        delta,
        rendererMainThreadBusyPercent:
          (delta.TaskDuration / (elapsedMs / 1000)) * 100,
      };
      records.push(record);
      process.stdout.write(JSON.stringify(record) + "\n");
      if (build === "after" && tab === "inventory") {
        if (startState.sceneMounted || audit.rect || audit.offset)
          throw new Error("Hidden scene still mounted/measured");
        const newPrice = await evaluate(
          `(() => {const bridge=${bridgeExpression}; const price=bridge.state.prices.mask+1; const result=bridge.dispatch({type:'setPrice',productId:'mask',price});if(!result.ok)throw new Error(JSON.stringify(result));return price})()`,
        );
        await delay(100);
        const priceFresh = await evaluate(
          `document.querySelector('.inventory-list').textContent.includes('Giá bán ${newPrice}')`,
        );
        if (!priceFresh)
          throw new Error(
            "Inventory did not update after in-place price change",
          );
        await click("Cửa hàng");
        await delay(150);
        if (!(await evaluate(`!!document.querySelector('.scene')`)))
          throw new Error("Scene failed to remount");
        assertions.push(
          "Mobile inventory unmounts scene, performs zero scene geometry reads, updates command data and remounts store",
        );
      }
      if (build === "after" && name === "player-store") {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(
          join(cwd, ".perf-store.png"),
          Buffer.from(shot.data, "base64"),
        );
      }
      if (build === "after" && pause && (audit.raf || startState.animations))
        throw new Error("Paused scene is still animating");
      if (build === "after" && reduced && startState.animations)
        throw new Error("Reduced effects still animating");
    }
  }
  // Responsive and OS accessibility checks after timing, outside the measured windows.
  await evaluate(
    `document.querySelector('button[aria-label="Trợ giúp và cài đặt"]').click()`,
  );
  await delay(50);
  await click("Giảm hiệu ứng: Bật");
  if (
    await evaluate(
      `document.querySelector('.app').classList.contains('effects-reduced')`,
    )
  )
    throw new Error("Effects menu did not disable preference");
  await click("Giảm hiệu ứng: Tắt");
  if (
    !(await evaluate(
      `document.querySelector('.app').classList.contains('effects-reduced') && JSON.parse(localStorage.getItem('idle-pharmacy.settings.v1')).reducedEffects`,
    ))
  )
    throw new Error("Effects menu did not persist preference");
  await evaluate(
    `document.querySelector('button[aria-label="Trợ giúp và cài đặt"]').click()`,
  );
  assertions.push(
    "Effects menu toggles and persists reduced-effects preference",
  );
  for (const [width, height] of [
    [375, 812],
    [844, 390],
    [1280, 900],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 1000,
    });
    await click("Kho");
    await delay(100);
    const mounted = await evaluate(`!!document.querySelector('.scene')`);
    if (mounted !== (width > 819 && height > 560))
      throw new Error(`Responsive visibility incorrect at ${width}x${height}`);
    await click("Cửa hàng");
    await delay(100);
    assertions.push(
      `Scene visibility follows breakpoint at ${width}x${height}`,
    );
  }
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await delay(100);
  if (
    await evaluate(`document.getAnimations().some(a=>a.playState==='running')`)
  )
    throw new Error("OS reduced motion not respected");
  assertions.push(
    "OS reduced motion disables animations; paused and reduced-effects scenes have no running animations",
  );
  const result = {
    reviewDate: "2026-10-01",
    baselineCommit: "3832adf",
    build: "production",
    seed: 42,
    version: await send("Browser.getVersion"),
    viewport: "390x844, DPR 1, mobile emulation",
    durationSeconds: 8,
    caveat:
      "Paired desktop headless Chrome runs with identical generated fixtures and instrumentation. TaskDuration/elapsed measures renderer main-thread busy time, not system CPU/GPU power or phone temperature. No real-device thermal claims.",
    records,
    assertions,
    errors,
  };
  await writeFile(
    "docs/performance-fix-browser-results.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  if (errors.length) throw new Error(`${errors.length} browser exceptions`);
} finally {
  socket?.close();
  if (chrome) {
    chrome.kill();
    await new Promise((ok) => chrome.once("exit", ok));
  }
  await new Promise((ok) => server.close(ok));
  await vite?.close();
  assert(
    resolve(profile).startsWith(resolve(tmpdir()) + sep + "pharmacy-perf-"),
    "Unexpected profile cleanup path",
  );
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}
