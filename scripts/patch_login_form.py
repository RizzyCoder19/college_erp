# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\auth\LoginForm.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = await loginAction({ email, password });"""

replacement = """  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const form = e.currentTarget;
      const emailEl = form.querySelector("#login-email") as HTMLInputElement | null;
      const passEl = form.querySelector("#login-password") as HTMLInputElement | null;
      const submitEmail = (emailEl?.value || email).trim();
      const submitPassword = passEl?.value || password;

      const result = await loginAction({ email: submitEmail, password: submitPassword });"""

assert target in content, "target not found in LoginForm.tsx"
content = content.replace(target, replacement, 1)

# Add name="email" and name="password"
content = content.replace('id="login-email"\n            type="email"', 'id="login-email"\n            name="email"\n            type="email"')
content = content.replace('id="login-password"\n            type="password"', 'id="login-password"\n            name="password"\n            type="password"')

with open(r"G:\rpihm-campusos\src\components\auth\LoginForm.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("LoginForm.tsx updated successfully")
