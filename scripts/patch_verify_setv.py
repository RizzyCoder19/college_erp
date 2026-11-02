# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """      const emailInput = document.getElementById("login-email") || document.getElementById("email");
      const passwordInput = document.getElementById("login-password") || document.getElementById("password");
      if (emailInput && passwordInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(emailInput, "${testStaff.email}");
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        emailInput.dispatchEvent(new Event("change", { bubbles: true }));
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(passwordInput, "${testInitialPw}");
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
        passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const submitBtn = document.getElementById("login-submit-button") || document.querySelector("button[type='submit']");
      if (submitBtn) (submitBtn as HTMLElement).click();"""

replacement1 = """      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(testStaff.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(testInitialPw)});
      const submitBtn = document.getElementById("login-submit-button");
      if (submitBtn) submitBtn.click();"""

assert target1 in content, "target1 not found"
content = content.replace(target1, replacement1, 1)

target2 = """      const emailInput = document.getElementById("login-email") || document.getElementById("email");
      const passwordInput = document.getElementById("login-password") || document.getElementById("password");
      if (emailInput && passwordInput) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(emailInput, "${adminCreds.email}");
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        emailInput.dispatchEvent(new Event("change", { bubbles: true }));
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(passwordInput, "${adminCreds.password}");
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
        passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const submitBtn = document.getElementById("login-submit-button") || document.querySelector("button[type='submit']");
      if (submitBtn) (submitBtn as HTMLElement).click();"""

replacement2 = """      const setV = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setV(document.getElementById("login-email"), ${JSON.stringify(adminCreds.email)});
      setV(document.getElementById("login-password"), ${JSON.stringify(adminCreds.password)});
      const submitBtn = document.getElementById("login-submit-button");
      if (submitBtn) submitBtn.click();"""

assert target2 in content, "target2 not found"
content = content.replace(target2, replacement2, 1)

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts updated with setV and JSON.stringify")
