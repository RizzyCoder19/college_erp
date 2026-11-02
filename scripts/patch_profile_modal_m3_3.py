# -*- coding: utf-8 -*-
with open(r"G:\rpihm-campusos\src\components\common\ProfileModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('import { FICTIONAL_USER } from "@/data/mockData";\n', '')
content = content.replace('import { FICTIONAL_USER } from "@/data/mockData";', '')

target_avatar = '{currentUser ? currentUser.fullName.slice(0, 2).toUpperCase() : "KS"}'
replacement_avatar = '{currentUser ? currentUser.fullName.slice(0, 2).toUpperCase() : "GU"}'
content = content.replace(target_avatar, replacement_avatar)

target_name = '{currentUser ? currentUser.fullName : FICTIONAL_USER.name}'
replacement_name = '{currentUser ? currentUser.fullName : "Guest User"}'
content = content.replace(target_name, replacement_name)

target_email = '{currentUser ? currentUser.email : FICTIONAL_USER.designation}'
replacement_email = '{currentUser ? (currentUser.designation ? currentUser.designation + " | " + currentUser.email : currentUser.email) : "Sign in to access institutional resources"}'
content = content.replace(target_email, replacement_email)

target_inst = '<span className="font-semibold text-slate-800">{FICTIONAL_USER.institution}</span>'
replacement_inst = '<span className="font-semibold text-slate-800">R. P. Institute of Hospitality & Management, Vasai</span>'
content = content.replace(target_inst, replacement_inst)

target_year = '<span className="font-medium text-slate-800">{FICTIONAL_USER.academicYear}</span>'
replacement_year = '<span className="font-medium text-slate-800">2026 - 2027</span>'
content = content.replace(target_year, replacement_year)

with open(r"G:\rpihm-campusos\src\components\common\ProfileModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("ProfileModal.tsx updated successfully")
