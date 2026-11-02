with open('src/app/modules/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'RPIHM CampusOS ERP' in line and 'title:' in line:
        new_lines.append('    title: ${moduleData.title} | RPIHM CampusOS ERP,\n')
    else:
        new_lines.append(line)

with open('src/app/modules/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Line 28 written with backticks')
