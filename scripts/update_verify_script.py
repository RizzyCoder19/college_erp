with open("scripts/verify_unit1_browser.js", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'const searchInput = document.querySelector("input[placeholder*=\'Search\']");',
    'const searchInput = document.getElementById("student-search-input");'
)

with open("scripts/verify_unit1_browser.js", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated scripts/verify_unit1_browser.js")
