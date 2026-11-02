# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Fix login input selectors everywhere
target_login_selectors = '''      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");'''

replacement_login_selectors = '''      const emailInput = document.getElementById("login-email") || document.getElementById("email");
      const passwordInput = document.getElementById("login-password") || document.getElementById("password");'''

content = content.replace(target_login_selectors, replacement_login_selectors)

target_submit_ananya = '''      const submitBtn = document.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 3000));

  // Verify Dashboard Identity Display'''

replacement_submit_ananya = '''      const submitBtn = document.getElementById("login-submit-button") || document.querySelector("button[type='submit']");
      if (submitBtn) (submitBtn as HTMLElement).click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2500));
  await cdp("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((r) => setTimeout(r, 2500));

  // Verify Dashboard Identity Display'''

content = content.replace(target_submit_ananya, replacement_submit_ananya, 1)

target_submit_admin = '''      const submitBtn = document.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 3000));

  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });'''

replacement_submit_admin = '''      const submitBtn = document.getElementById("login-submit-button") || document.querySelector("button[type='submit']");
      if (submitBtn) (submitBtn as HTMLElement).click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2500));
  await cdp("Page.navigate", { url: "http://localhost:3000/modules/faculty" });'''

content = content.replace(target_submit_admin, replacement_submit_admin, 1)

with open(r"G:\rpihm-campusos\scripts\verify_milestone3_3_full.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("verify_milestone3_3_full.ts updated successfully")
