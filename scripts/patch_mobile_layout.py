with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('className="min-h-screen w-full bg-[#F4F6F9] text-slate-900 flex flex-col relative"', 'className="min-h-screen w-full bg-[#F4F6F9] text-slate-900 flex flex-col relative overflow-x-hidden"')
c = c.replace('className="flex-1 flex flex-col min-w-0 lg:pl-64 w-full"', 'className="flex-1 flex flex-col min-w-0 lg:pl-64 w-full overflow-x-hidden"')
c = c.replace('2026 \ufffd?" 27', '2026-27')
c = c.replace('Affiliated to University of Mumbai \ufffd?\ufffd Approved by Govt. of Maharashtra \ufffd?\ufffd CampusOS ERP', 'Affiliated to University of Mumbai \u2022 Approved by Govt. of Maharashtra \u2022 CampusOS ERP')
c = c.replace('Prototype Console \ufffd?\ufffd Sample Data', 'Prototype Console \u2022 Sample Data')
with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/components/layout/TopBar.tsx', 'r', encoding='utf-8') as f:
    t = f.read()
t = t.replace('mx-3 sm:mx-6 flex items-center justify-center', 'min-w-0 mx-1.5 sm:mx-6 flex items-center justify-center')
t = t.replace('placeholder="Search students, faculty, programmes, notices\ufffd?\ufffd (Ctrl+K)"', 'placeholder="Search CampusOS... (Ctrl+K)"')
t = t.replace('placeholder="Search students, faculty, programmes, notices (Ctrl+K)"', 'placeholder="Search CampusOS... (Ctrl+K)"')
t = t.replace('2026 \ufffd?" 27', '2026-27')
t = t.replace('2025 \ufffd?" 26', '2025-26')
t = t.replace('2024 \ufffd?" 25', '2024-25')
with open('src/components/layout/TopBar.tsx', 'w', encoding='utf-8') as f:
    f.write(t)
print('Layout files updated for responsive polish')
