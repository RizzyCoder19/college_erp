const { spawn } = require("child_process");
const fs = require("fs");

async function testUnit1Browser() {
  console.log("=== RPIHM CampusOS: Unit 1 Live-Browser Checkpoint ===");
  const edgeProc = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless", "--remote-debugging-port=9236", "--disable-gpu", "--no-sandbox", "--window-size=1440,900"
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try { await fetch("http://localhost:9236/json/version"); break; } catch(e){}
  }

  const tab = await (await fetch("http://localhost:9236/json/new", { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r));

  function cdp(method, params = {}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 1e6);
      const h = e => {
        const m = JSON.parse(e.data);
        if (m.id === id) { ws.removeEventListener("message", h); m.error ? rej(m.error) : res(m.result); }
      };
      ws.addEventListener("message", h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const consoleErrors = [];
  const networkErrors = [];

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
      const text = m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
      consoleErrors.push(`[CONSOLE ${m.params.type.toUpperCase()}] ${text}`);
    }
    if (m.method === "Network.loadingFailed") {
      networkErrors.push(`[NETWORK FAILED] ${m.params.errorText}`);
    }
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable");

  // Step 1: Login
  console.log("\n[Step 1] Authenticating at /login...");
  await cdp("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise(r => setTimeout(r, 2000));

  const creds = JSON.parse(fs.readFileSync("dev-admin-credentials.json", "utf8"));
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const setV = (el, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(creds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(creds.password)});
      document.getElementById("login-submit-button").click();
    })()`
  });

  // Wait for redirect away from /login
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const loc = await cdp("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true
    });
    if (loc.result.value && !loc.result.value.includes("/login")) {
      console.log("Authenticated successfully, redirected to:", loc.result.value);
      break;
    }
  }

  // Step 2: Navigate to Students
  console.log("\n[Step 2] Navigating to /modules/students...");
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/students" });
  await new Promise(r => setTimeout(r, 4000));

  // Step 3: Check Table Rows & Roll Number Display
  console.log("\n[Step 3] Verifying table rows and PRN / Roll Number rendering...");
  const initialTable = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr")).map(tr => {
        return {
          prnCell: tr.querySelector("td")?.innerText?.replace(/\\n/g, " "),
          name: tr.querySelector("td:nth-child(2)")?.innerText?.split("\\n")?.[0] || ""
        };
      });
      return {
        totalRows: rows.length,
        aaravRow: rows.find(r => r.name.includes("Aarav Sharma") || (r.prnCell && r.prnCell.includes("2026DS041")))
      };
    })()`,
    returnByValue: true
  });
  console.log("Initial table inspection:", initialTable.result.value);

  // Step 4: Test Programme Filter against 2026DS041
  console.log("\n[Step 4] Testing Programme Filter: Selecting 'B.Sc. Data Science with AI'...");
  const progFilterRes = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const progSelect = document.getElementById("student-programme-filter") || Array.from(document.querySelectorAll("select")).find(s => {
        return Array.from(s.options).some(o => o.text.includes("Data Science") || o.text.includes("BSCDS"));
      });
      if (!progSelect) return { error: "Programme select not found" };

      // Find the option for Data Science
      const dsOption = Array.from(progSelect.options).find(o => o.text.includes("Data Science") || o.text.includes("BSCDS"));
      if (!dsOption) return { error: "Data science option not found in dropdown" };

      progSelect.value = dsOption.value;
      progSelect.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        selectedOptionText: dsOption.text,
        selectedOptionValue: dsOption.value
      };
    })()`,
    returnByValue: true
  });
  console.log("Programme filter selected:", progFilterRes.result.value);

  await new Promise(r => setTimeout(r, 1500));

  const afterProgFilter = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr")).map(tr => tr.innerText.replace(/\\n/g, " | "));
      const aaravVisible = rows.some(r => r.includes("2026DS041") || r.includes("Aarav Sharma"));
      return {
        filteredRowCount: rows.length,
        aaravVisible,
        rows
      };
    })()`,
    returnByValue: true
  });
  console.log("Table after Programme Filter:", afterProgFilter.result.value);

  // Capture screenshot of Programme Filter
  const progScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit1_programme_filter.png", Buffer.from(progScreenshot.data, "base64"));
  console.log("Saved screenshot: unit1_programme_filter.png (" + fs.statSync("unit1_programme_filter.png").size + " bytes)");

  // Reset programme filter to 'all'
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const progSelect = document.getElementById("student-programme-filter") || Array.from(document.querySelectorAll("select")).find(s => {
        return Array.from(s.options).some(o => o.text.includes("All Programmes"));
      });
      if (progSelect) {
        progSelect.value = "all";
        progSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Step 5: Test Search with PRN '2026DS041'
  console.log("\n[Step 5] Testing Search with PRN '2026DS041'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const searchInput = document.getElementById("student-search-input") || document.querySelector("input[placeholder*='Search']");
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(searchInput, "2026DS041");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  const searchPrnRes = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr")).map(tr => tr.innerText.replace(/\\n/g, " | "));
      return {
        rowCount: rows.length,
        aaravFound: rows.some(r => r.includes("2026DS041") && r.includes("Aarav Sharma")),
        rows
      };
    })()`,
    returnByValue: true
  });
  console.log("Search by PRN '2026DS041' outcome:", searchPrnRes.result.value);

  // Step 6: Test Search with Roll Number 'RPIHM-2026DS041'
  console.log("\n[Step 6] Testing Search with official Roll Number 'RPIHM-2026DS041'...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const searchInput = document.getElementById("student-search-input") || document.querySelector("input[placeholder*='Search']");
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(searchInput, "RPIHM-2026DS041");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  const searchRollRes = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr")).map(tr => tr.innerText.replace(/\\n/g, " | "));
      return {
        rowCount: rows.length,
        aaravFound: rows.some(r => r.includes("2026DS041") && r.includes("Aarav Sharma")),
        firstRowText: rows[0] || "",
        rows
      };
    })()`,
    returnByValue: true
  });
  console.log("Search by Roll Number 'RPIHM-2026DS041' outcome:", searchRollRes.result.value);

  // Capture screenshot of Roll Number Search
  const rollScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("unit1_roll_search.png", Buffer.from(rollScreenshot.data, "base64"));
  console.log("Saved screenshot: unit1_roll_search.png (" + fs.statSync("unit1_roll_search.png").size + " bytes)");

  // Step 7: Clear search and test page reload persistence
  console.log("\n[Step 7] Clearing search and testing page reload persistence...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const searchInput = document.getElementById("student-search-input") || document.querySelector("input[placeholder*='Search']");
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(searchInput, "");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  await cdp("Page.reload");
  await new Promise(r => setTimeout(r, 4000));

  // Re-verify after reload
  const postReloadCheck = await cdp("Runtime.evaluate", {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr")).map(tr => ({
        prnCell: tr.querySelector("td")?.innerText?.replace(/\\n/g, " "),
        name: tr.querySelector("td:nth-child(2)")?.innerText?.split("\\n")?.[0] || ""
      }));
      return {
        totalRows: rows.length,
        aaravRow: rows.find(r => r.name.includes("Aarav Sharma"))
      };
    })()`,
    returnByValue: true
  });
  console.log("Post-reload table check:", postReloadCheck.result.value);

  console.log("\n[Step 8] Checking console errors and network failures...");
  console.log("Console errors/warnings count:", consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);
  console.log("Network failures count:", networkErrors.length);
  if (networkErrors.length > 0) console.log(networkErrors);

  ws.close();
  edgeProc.kill();
  console.log("\n=== Unit 1 Live-Browser Checkpoint Complete ===");
}

testUnit1Browser().then(() => process.exit(0)).catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
