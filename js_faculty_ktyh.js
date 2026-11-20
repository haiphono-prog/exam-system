// =========================================================================
// 🏥 MODULE QUẢN TRỊ KHOA KỸ THUẬT Y HỌC — PHÂN CẤP 6 TẦNG (js_faculty_ktyh.js v4.0)
// - Tách biệt: Admin tối cao (admin/all) vs 5 cấp Khoa KTYH:
//   1. Lãnh đạo Khoa (ktyh_dean)
//   2. Lãnh đạo Bộ môn (ktyh_head)
//   3. Giáo vụ Khoa (ktyh_academic)
//   4. Chuyên viên Khoa (ktyh_specialist)
//   5. Giảng viên (teacher)
//   + Cờ kiêm nhiệm Người chấm công (is_timekeeper)
// - Kết nối Supabase: public.users + public.staff_profiles + public.staff_timesheets
// - Chuẩn Super App Tràn Viền 100dvh + Chuẩn CSS Cục Bộ Chống Đơ Cảm Ứng
// =========================================================================

window.KTYH_DEPARTMENTS = {
    'BM_KTXN':   { code: 'BM_KTXN',   name: 'Bộ môn Kỹ thuật Xét nghiệm',        short: 'BM KTXN',       icon: 'bi-eyedropper',       color: '#38bdf8' },
    'BM_KHCB':   { code: 'BM_KHCB',   name: 'Bộ môn Khoa học Cơ bản',            short: 'BM KHCB',       icon: 'bi-book-half',        color: '#a855f7' },
    'BM_DUOC':   { code: 'BM_DUOC',   name: 'Bộ môn Dược',                       short: 'BM Dược',       icon: 'bi-capsule-pill',     color: '#f59e0b' },
    'BM_DD':     { code: 'BM_DD',     name: 'Bộ môn Điều dưỡng',                 short: 'BM Điều dưỡng', icon: 'bi-heart-pulse-fill', color: '#10b981' },
    'VP_KHOA':   { code: 'VP_KHOA',   name: 'Văn phòng Khoa KTYH',               short: 'VP Khoa KTYH',  icon: 'bi-building-gear',    color: '#ec4899' },
    'PHONG_BAN': { code: 'PHONG_BAN', name: 'Ban Giám hiệu / Phòng / TT / BV',   short: 'Phòng/Ban/BV',  icon: 'bi-bank2',            color: '#94a3b8' }
};

window.KTYH_ROLE_META = {
    'admin':           { key: 'admin',           title: '👑 Quản trị Hệ thống (Admin)', short: 'Admin',          color: '#dc2626', badgeCls: 'bg-danger text-white' },
    'ktyh_dean':       { key: 'ktyh_dean',       title: '🏛️ Lãnh đạo Khoa KTYH',       short: 'Lãnh đạo Khoa',  color: '#e11d48', badgeCls: 'bg-danger text-white' },
    'ktyh_head':       { key: 'ktyh_head',       title: '🔬 Lãnh đạo Bộ môn',          short: 'Lãnh đạo BM',    color: '#7c3aed', badgeCls: 'bg-primary text-white' },
    'ktyh_academic':   { key: 'ktyh_academic',   title: '📚 Giáo vụ Khoa KTYH',        short: 'Giáo vụ Khoa',   color: '#0284c7', badgeCls: 'bg-info text-dark' },
    'ktyh_specialist': { key: 'ktyh_specialist', title: '🗂️ Chuyên viên Khoa',         short: 'Chuyên viên',    color: '#d97706', badgeCls: 'bg-warning text-dark' },
    'teacher':         { key: 'teacher',         title: '👨‍🏫 Giảng viên Khoa KTYH',    short: 'Giảng viên',     color: '#059669', badgeCls: 'bg-success text-white' }
};

window.KTYH_ATTENDANCE_SYMBOLS = {
    '+':  { code: '+',  label: '+ (Làm việc)',       badge: 'bg-success text-white',       desc: 'Đi làm hưởng lương thời gian (1 công)' },
    'HT': { code: 'HT', label: 'HT (Học tập)',       badge: 'bg-info text-dark',           desc: 'Đi học tập trung (Quy ra công TG = 0)' },
    'P':  { code: 'P',  label: 'P (Nghỉ phép)',      badge: 'bg-primary text-white',       desc: 'Nghỉ phép năm hưởng nguyên lương' },
    'CT': { code: 'CT', label: 'CT (Công tác)',      badge: 'bg-warning text-dark',        desc: 'Đi công tác hưởng lương thời gian' },
    'L':  { code: 'L',  label: 'L (Nghỉ Lễ/Tết)',    badge: 'bg-warning text-dark',        desc: 'Nghỉ Lễ, Tết hưởng nguyên lương' },
    'KL': { code: 'KL', label: 'KL (Không lương)',   badge: 'bg-secondary text-white',     desc: 'Nghỉ việc riêng không hưởng lương' },
    'Ô':  { code: 'Ô',  label: 'Ô (Nghỉ ốm - BHXH)', badge: 'bg-danger text-white',        desc: 'Nghỉ ốm hưởng chế độ BHXH' },
    'TS': { code: 'TS', label: 'TS (Thai sản)',      badge: 'bg-danger text-white',        desc: 'Nghỉ thai sản hưởng chế độ BHXH' },
    '':   { code: '',   label: 'Trống (Nghỉ T7/CN)', badge: 'bg-dark text-white-50 border', desc: 'Nghỉ cuối tuần (Thứ 7, Chủ Nhật)' }
};

window._ktyhState = {
    activeTab: 'overview',         // 'overview' | 'timesheet' | 'profiles' | 'subjects_exams'
    previewRole: null,             // Chỉ dành cho Admin xem thử góc nhìn các cấp khác
    selectedDept: 'ALL',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),
    contractFilter: 'ALL',         // 'ALL' | 'VC' | 'HDLD'
    degreeFilter: 'ALL',           // 'ALL' | 'TS' | 'THS' | 'CKI' | 'DH'
    selectedPersonCode: 'ALL',
    activeBrushSymbol: '+',
    searchQuery: '',
    profilesList: [],
    timesheetMap: {}
};

// =========================================================================
// 🔧 1. TIỆN ÍCH CHUẨN HÓA DỮ LIỆU
// =========================================================================
window.clean_vn_str = function(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

window.format_excel_date_vn = function(val) {
    if (val === null || val === undefined || val === '') return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
        return `${String(val.getDate()).padStart(2, '0')}/${String(val.getMonth() + 1).padStart(2, '0')}/${val.getFullYear()}`;
    }
    if (typeof val === 'number' && val > 1000 && val < 100000) {
        let dt = new Date(Math.floor(val - 25569) * 86400 * 1000);
        if (!isNaN(dt.getTime())) {
            return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
        }
    }
    return String(val).trim();
};

window.normalize_vn_phone = function(val) {
    if (val === null || val === undefined || val === '') return '';
    let s = String(val).replace(/[^\d]/g, '');
    if (s.length === 9 && !s.startsWith('0')) s = '0' + s;
    return s;
};

window.infer_ktyh_dept_from_row = function(jobPos, unitStr, rankNgach, majorStr) {
    let pos = window.clean_vn_str(jobPos);
    let unit = window.clean_vn_str(unitStr);
    let ngach = window.clean_vn_str(rankNgach);
    let maj = window.clean_vn_str(majorStr);

    if (pos.includes('ktxn') || unit.includes('ktxn') || unit.includes('xet nghiem')) return 'BM_KTXN';
    if (pos.includes('khcb') || unit.includes('khcb') || unit.includes('khoa hoc co ban')) return 'BM_KHCB';
    if (pos.includes('bm duoc') || unit.includes('bo mon duoc') || unit.includes('bm duoc')) return 'BM_DUOC';
    if (pos.includes('bm dieu duong') || unit.includes('bo mon dieu duong')) return 'BM_DD';

    let isFaculty = unit.includes('ky thuat y hoc') || unit.includes('ktyh') || pos.includes('ktyh');
    if (!isFaculty) return 'PHONG_BAN';
    if (ngach.includes('chuyen vien') && !pos.includes('truong') && !pos.includes('pho')) return 'VP_KHOA';

    if (maj.includes('duoc')) return 'BM_DUOC';
    if (maj.includes('dieu duong')) return 'BM_DD';
    if (['tieng anh', 'anh van', 'ngon ngu anh', 'triet hoc', 'luat', 'toan', 'vat ly', 'hoa hoc', 'may tinh', 'cong nghe thong tin', 'the chat', 'the duc', 'quan ly giao duc'].some(k => maj.includes(k))) {
        return 'BM_KHCB';
    }
    return 'BM_KTXN';
};

window.infer_ktyh_role_from_row = function(jobPos, rankNgach = '') {
    let p = window.clean_vn_str(jobPos);
    let n = window.clean_vn_str(rankNgach);
    if (p.includes('truong khoa') || p.includes('pho khoa') || p.includes('ktyh_dean')) return 'ktyh_dean';
    if (p.includes('truong bm') || p.includes('pho truong bm') || p.includes('truong bo mon') || p.includes('ktyh_head')) return 'ktyh_head';
    if (p.includes('giao vu') || p.includes('ktyh_academic')) return 'ktyh_academic';
    if (p.includes('chuyen vien') || p.includes('ktyh_specialist') || (n.includes('chuyen vien') && !p.includes('truong'))) return 'ktyh_specialist';
    return 'teacher';
};

window.generate_unique_staff_code = function(fullName, usedCodesSet) {
    let parts = window.clean_vn_str(fullName).split(' ').filter(Boolean);
    if (parts.length === 0) return 'cb_' + Math.floor(Math.random() * 9000 + 1000);
    let firstName = parts[parts.length - 1];
    let initials = parts.slice(0, -1).map(p => p[0]).join('');
    let base = `${firstName}_${initials || 'gv'}`;
    let candidate = base, counter = 2;
    while (usedCodesSet.has(candidate.toLowerCase())) {
        candidate = `${base}${counter}`;
        counter++;
    }
    usedCodesSet.add(candidate.toLowerCase());
    return candidate;
};

window.check_salary_upgrade_status = function(startDateStr) {
    if (!startDateStr) return null;
    let m = String(startDateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    let yr = parseInt(m[3], 10);
    if (yr < 1980 || yr > 2030) return null;
    let dt = new Date(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    let now = new Date();
    let diffMonths = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    if (diffMonths >= 36) return { level: 'due', label: '🔔 Đến hạn nâng bậc', cls: 'bg-danger text-white' };
    if (diffMonths >= 33) return { level: 'soon', label: '⏳ Sắp đến hạn (3 năm)', cls: 'bg-warning text-dark' };
    return null;
};

// =========================================================================
// 🔐 2. ĐĂNG KÝ 4 ROLE KHOA KTYH VÀO RBAC STUDIO & BỘ PHÂN QUYỀN 6 TẦNG
// =========================================================================
window.register_ktyh_roles_to_rbac = function() {
    if (!window.RBAC_ROLE_PRESETS) return;
    const baseTeacher = (window.DEFAULT_RBAC_ROLE_TEMPLATES && window.DEFAULT_RBAC_ROLE_TEMPLATES.teacher)
        ? window.DEFAULT_RBAC_ROLE_TEMPLATES.teacher.permissions : {};

    const defs = {
        'ktyh_dean': {
            label: '🏛️ Lãnh đạo Khoa KTYH', badgeClass: 'bg-danger text-white', legacyPermText: 'banks,exams,subjects,stats',
            extra: {
                bank_delete_questions: true, sys_manage_subjects: true,
                ktyh_portal_access: true, ktyh_view_all_depts: true, ktyh_timesheet_manage: true,
                ktyh_timesheet_approve: true, ktyh_export_full_c01: true, ktyh_hr_view_sensitive: true,
                ktyh_hr_edit_role: true, ktyh_hr_import_delete: false
            }
        },
        'ktyh_head': {
            label: '🔬 Lãnh đạo Bộ môn', badgeClass: 'bg-primary text-white', legacyPermText: 'banks,exams,stats',
            extra: {
                bank_delete_questions: true,
                ktyh_portal_access: true, ktyh_view_all_depts: false, ktyh_timesheet_manage: true,
                ktyh_timesheet_approve: true, ktyh_export_full_c01: true, ktyh_hr_view_sensitive: false,
                ktyh_hr_edit_role: false, ktyh_hr_import_delete: false
            }
        },
        'ktyh_academic': {
            label: '📚 Giáo vụ Khoa KTYH', badgeClass: 'bg-info text-dark', legacyPermText: 'exams,subjects,stats',
            extra: {
                sys_manage_subjects: true,
                ktyh_portal_access: true, ktyh_view_all_depts: true, ktyh_timesheet_manage: true,
                ktyh_timesheet_approve: false, ktyh_export_full_c01: true, ktyh_hr_view_sensitive: false,
                ktyh_hr_edit_role: false, ktyh_hr_import_delete: false
            }
        },
        'ktyh_specialist': {
            label: '🗂️ Chuyên viên Khoa', badgeClass: 'bg-warning text-dark', legacyPermText: 'stats',
            extra: {
                ktyh_portal_access: true, ktyh_view_all_depts: false, ktyh_timesheet_manage: false,
                ktyh_timesheet_approve: false, ktyh_export_full_c01: false, ktyh_hr_view_sensitive: false,
                ktyh_hr_edit_role: false, ktyh_hr_import_delete: false
            }
        }
    };

    Object.keys(defs).forEach(k => {
        if (!window.RBAC_ROLE_PRESETS[k]) {
            window.RBAC_ROLE_PRESETS[k] = {
                roleKey: k,
                label: defs[k].label,
                badgeClass: defs[k].badgeClass,
                groupType: 'staff',
                legacyPermText: defs[k].legacyPermText,
                permissions: Object.assign({}, baseTeacher, defs[k].extra)
            };
        }
    });
};
setTimeout(window.register_ktyh_roles_to_rbac, 400);

// Tính toán chi tiết quyền hạn theo đúng 6 tầng (Tách biệt Admin với Khoa)
window.get_current_ktyh_profile = function() {
    let uid = String(window.current_student_id || '').trim();
    let uname = String(window.current_student_name || uid).trim();
    let roleRaw = String(window.current_user_role || '').trim().toLowerCase();

    let matched = (window._ktyhState.profilesList || []).find(p =>
        String(p.staff_code).toLowerCase() === uid.toLowerCase() ||
        window.clean_vn_str(p.full_name) === window.clean_vn_str(uname)
    );

    let isRealAdmin = (roleRaw === 'admin' || roleRaw === 'all');
    let realRole = isRealAdmin ? 'admin' : (matched ? (matched.ktyh_role || 'teacher') : (window.KTYH_ROLE_META[roleRaw] ? roleRaw : 'teacher'));
    if (realRole === 'timekeeper') realRole = 'ktyh_specialist'; // Tương thích ngược dữ liệu cũ

    // Nếu là Admin và đang bật "Xem thử góc nhìn cấp khác"
    let activeRole = (isRealAdmin && window._ktyhState.previewRole) ? window._ktyhState.previewRole : realRole;
    let isTimekeeper = Boolean(matched && matched.is_timekeeper);
    let deptCode = matched ? (matched.dept_code || 'BM_KTXN') : 'BM_KTXN';
    let meta = window.KTYH_ROLE_META[activeRole] || window.KTYH_ROLE_META.teacher;

    // Đọc công tắc quyền trực tiếp từ RBAC Studio (ưu tiên tinh chỉnh cá nhân -> mẫu Role -> mặc định)
    let rbacPerms = (window.current_rbac_profile && window.current_rbac_profile.permissions)
        ? window.current_rbac_profile.permissions : {};

    const checkPerm = (permKey, defaultBool) => {
        if (activeRole === 'admin') return true;
        if (!window._ktyhState.previewRole && typeof rbacPerms[permKey] === 'boolean') {
            return rbacPerms[permKey];
        }
        return defaultBool;
    };

    const canManageTs = checkPerm('ktyh_timesheet_manage', ['admin', 'ktyh_dean', 'ktyh_head', 'ktyh_academic'].includes(activeRole) || isTimekeeper);

    // Ma trận quyền hạn chuẩn 6 tầng (điều khiển trực tiếp từ RBAC Studio)
    const perms = {
        isAdmin:             activeRole === 'admin',
        canImportExcel:      checkPerm('ktyh_hr_import_delete', activeRole === 'admin'),
        canDeleteStaff:      checkPerm('ktyh_hr_import_delete', activeRole === 'admin'),
        canOpenRBAC:         activeRole === 'admin',
        canEditStaffRole:    checkPerm('ktyh_hr_edit_role', ['admin', 'ktyh_dean'].includes(activeRole)),
        canViewAllDepts:     checkPerm('ktyh_view_all_depts', ['admin', 'ktyh_dean', 'ktyh_academic'].includes(activeRole)),
        canViewSensitive:    checkPerm('ktyh_hr_view_sensitive', ['admin', 'ktyh_dean'].includes(activeRole)),
        canViewTimesheetAll: canManageTs,
        canApproveTimesheet: checkPerm('ktyh_timesheet_approve', ['admin', 'ktyh_dean', 'ktyh_head'].includes(activeRole)),
        canExportFullC01:    checkPerm('ktyh_export_full_c01', ['admin', 'ktyh_dean', 'ktyh_head', 'ktyh_academic'].includes(activeRole) || isTimekeeper),
        canAccessAcademic:   ['admin', 'ktyh_dean', 'ktyh_head', 'ktyh_academic', 'teacher'].includes(activeRole),
        isPersonalOnly:      !canManageTs
    };

    // Danh sách Tab phù hợp riêng cho từng cấp
    let tabs = [];
    if (['admin', 'ktyh_dean'].includes(activeRole)) {
        tabs = [
            { id: 'overview',       label: '1. Tổng quan Khoa',      icon: 'bi-grid-1x2-fill' },
            { id: 'timesheet',      label: '2. Chấm công (C01-HD)',  icon: 'bi-calendar2-check-fill' },
            { id: 'profiles',       label: '3. Hồ sơ Nhân sự',       icon: 'bi-person-vcard-fill' },
            { id: 'subjects_exams', label: '4. Học phần & Đề thi',   icon: 'bi-journal-check' }
        ];
    } else if (activeRole === 'ktyh_head') {
        tabs = [
            { id: 'overview',       label: '1. Dashboard Bộ môn',    icon: 'bi-pie-chart-fill' },
            { id: 'timesheet',      label: '2. Chấm công Bộ môn',    icon: 'bi-calendar2-check-fill' },
            { id: 'profiles',       label: '3. Nhân sự Bộ môn',      icon: 'bi-people-fill' },
            { id: 'subjects_exams', label: '4. Học phần & Đề thi',   icon: 'bi-journal-check' }
        ];
    } else if (activeRole === 'ktyh_academic') {
        tabs = [
            { id: 'subjects_exams', label: '1. Học phần & Đề thi',   icon: 'bi-journal-check' },
            { id: 'timesheet',      label: '2. Tổng hợp C01-HD',     icon: 'bi-calendar2-check-fill' },
            { id: 'profiles',       label: '3. Danh bạ Giảng viên',  icon: 'bi-person-lines-fill' }
        ];
    } else if (activeRole === 'ktyh_specialist') {
        tabs = [
            { id: 'timesheet',      label: isTimekeeper ? '1. Chấm công Đơn vị (C01-HD)' : '1. Tự chấm công cá nhân', icon: 'bi-calendar2-check-fill' },
            { id: 'profiles',       label: '2. Hồ sơ cá nhân',       icon: 'bi-person-vcard-fill' }
        ];
    } else {
        // Giảng viên (teacher)
        tabs = [
            { id: 'timesheet',      label: '1. Lịch tự chấm công',   icon: 'bi-calendar2-check-fill' },
            { id: 'subjects_exams', label: '2. Học phần & Đề thi',   icon: 'bi-journal-check' },
            { id: 'profiles',       label: '3. Hồ sơ cá nhân',       icon: 'bi-person-vcard-fill' }
        ];
    }

    return {
        student_id: uid,
        staff_code: matched ? matched.staff_code : uid,
        full_name: matched ? matched.full_name : uname,
        isRealAdmin: isRealAdmin,
        activeRole: activeRole,
        isTimekeeper: isTimekeeper,
        levelTitle: meta.title + (isTimekeeper && !['admin', 'ktyh_dean', 'ktyh_head'].includes(activeRole) ? ' • Chấm công' : ''),
        badgeColor: meta.color,
        deptCode: deptCode,
        deptName: window.KTYH_DEPARTMENTS[deptCode]?.name || 'Khoa Kỹ thuật Y học',
        perms: perms,
        tabs: tabs
    };
};

window.can_access_ktyh_portal = function() {
    let r = String(window.current_user_role || '').toLowerCase();
    if (r === 'all' || r === 'admin') return true;
    let rbacPerms = window.current_rbac_profile && window.current_rbac_profile.permissions;
    if (rbacPerms && typeof rbacPerms.ktyh_portal_access === 'boolean') {
        return rbacPerms.ktyh_portal_access;
    }
    return ['ktyh_dean', 'ktyh_head', 'ktyh_academic', 'ktyh_specialist', 'teacher', 'timekeeper'].includes(r) || r.includes('gv');
};

// Tự động gắn thẻ vào Sảnh Quản trị (Admin Hub)
(function autoInjectKtyhCardToHub() {
    const injectHook = () => {
        if (typeof window.render_admin_hub === 'function' && !window._isKtyhHubHooked) {
            const _orig = window.render_admin_hub;
            window._isKtyhHubHooked = true;
            window.render_admin_hub = function(...args) {
                let res = _orig.apply(this, args);
                try {
                    if (!window.can_access_ktyh_portal()) return res;
                    let row = document.querySelector('#dash_subject_cards_container .row');
                    if (row && !document.getElementById('ktyh_hub_card_entry')) {
                        let prof = window.get_current_ktyh_profile();
                        row.insertAdjacentHTML('beforeend', `
                        <div id="ktyh_hub_card_entry" class="col-12 col-md-6 px-1 animate__animated animate__zoomIn">
                            <div class="admin-dash-card" onclick="window.open_ktyh_faculty_portal()" style="border-color: rgba(16, 185, 129, 0.45); background: linear-gradient(135deg, #111827 0%, #064e3b 100%);">
                                <div class="admin-dash-icon" style="color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); background: rgba(16, 185, 129, 0.15);">
                                    <i class="bi bi-hospital-fill"></i>
                                </div>
                                <div class="admin-dash-info">
                                    <div class="admin-dash-title" style="color: #34d399;">KHOA KỸ THUẬT Y HỌC</div>
                                    <div class="admin-dash-desc">Cổng điều hành phân cấp 6 tầng: Nhân sự Viên chức/HĐLĐ, Chấm công C01-HD &amp; Học phần.</div>
                                    <div class="admin-dash-stats" style="color: #a7f3d0; border: 1px solid rgba(52, 211, 153, 0.4);">
                                        <i class="bi bi-person-badge-fill"></i> ${prof.levelTitle}
                                    </div>
                                </div>
                            </div>
                        </div>`);
                    }
                } catch (e) {}
                return res;
            };
        }
    };
    window.addEventListener('load', injectHook);
    setTimeout(injectHook, 500);
})();

// =========================================================================
// ☁️ 3. ĐỒNG BỘ DỮ LIỆU SUPABASE (staff_profiles & staff_timesheets)
// =========================================================================
window.get_days_in_month = (m, y) => new Date(y, m, 0).getDate();

window.get_day_of_week_info = function(day, month, year) {
    let dow = new Date(year, month - 1, day).getDay();
    return { dow, label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow], isWeekend: (dow === 0 || dow === 6) };
};

window.generate_default_days_json = function(defaultSym, month, year) {
    let numDays = window.get_days_in_month(month, year);
    let days = {};
    for (let d = 1; d <= numDays; d++) {
        let w = window.get_day_of_week_info(d, month, year);
        days[d] = (defaultSym === 'HT') ? 'HT' : (w.isWeekend ? '' : '+');
    }
    return days;
};

window.calculate_c01_summary_counts = function(daysMap, numDays) {
    let paidDays = 0, unpaidDays = 0, bhxhDays = 0, studyDays = 0;
    for (let d = 1; d <= numDays; d++) {
        let sym = String((daysMap && daysMap[d]) || '').trim().toUpperCase();
        if (sym === '+' || sym === 'P' || sym === 'CT' || sym === 'L') paidDays += 1;
        else if (sym === 'N/2' || sym === '1/2') paidDays += 0.5;
        else if (sym === 'KL' || sym === 'RO') unpaidDays += 1;
        else if (sym === 'Ô' || sym === 'O' || sym === 'TS' || sym === 'CO') bhxhDays += 1;
        else if (sym === 'HT') studyDays += 1;
    }
    return { paidDays, unpaidDays, bhxhDays, studyDays };
};

window.load_ktyh_db_data = async function() {
    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthKey = `${y}_${String(m).padStart(2, '0')}`;

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        if (!clientDb) return;

        const [profRes, tsRes] = await Promise.all([
            clientDb.from('staff_profiles').select('*').order('first_name', { ascending: true }),
            clientDb.from('staff_timesheets').select('*').eq('month_key', monthKey)
        ]);

        if (!profRes.error && Array.isArray(profRes.data)) {
            window._ktyhState.profilesList = profRes.data;
        }

        let mapForMonth = {};
        if (!tsRes.error && Array.isArray(tsRes.data)) {
            tsRes.data.forEach(row => { mapForMonth[row.staff_code] = row; });
        }

        (window._ktyhState.profilesList || []).forEach(p => {
            if (!mapForMonth[p.staff_code]) {
                let defDays = window.generate_default_days_json(p.default_attendance_sym || '+', m, y);
                let sum = window.calculate_c01_summary_counts(defDays, window.get_days_in_month(m, y));
                mapForMonth[p.staff_code] = {
                    staff_code: p.staff_code, month_key: monthKey, dept_code: p.dept_code || 'BM_KTXN',
                    contract_type: p.contract_type || 'VC', days_json: defDays,
                    paid_days: sum.paidDays, unpaid_days: sum.unpaidDays, bhxh_days: sum.bhxhDays, study_days: sum.studyDays,
                    status: 'draft', _isUnsaved: true
                };
            }
        });
        window._ktyhState.timesheetMap[monthKey] = mapForMonth;
    } catch (err) {
        window.show_toast("⚠️ Không tải được dữ liệu Khoa KTYH: " + err.message, true);
    }
};

window.save_ktyh_timesheets_to_db = async function(targetStaffCode = null, approveStatus = null) {
    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthKey = `${y}_${String(m).padStart(2, '0')}`;
    let numDays = window.get_days_in_month(m, y);
    let monthMap = window._ktyhState.timesheetMap[monthKey] || {};
    let prof = window.get_current_ktyh_profile();

    let codes = targetStaffCode ? [targetStaffCode] : Object.keys(monthMap);
    let activeDept = prof.perms.canViewAllDepts ? window._ktyhState.selectedDept : prof.deptCode;
    if (!targetStaffCode && activeDept !== 'ALL') {
        codes = codes.filter(c => monthMap[c]?.dept_code === activeDept);
    }

    let payloads = [];
    codes.forEach(code => {
        let rec = monthMap[code];
        if (!rec) return;
        let sum = window.calculate_c01_summary_counts(rec.days_json || {}, numDays);
        let newStatus = approveStatus || (rec.status === 'draft' ? 'submitted' : rec.status);

        rec.paid_days = sum.paidDays; rec.unpaid_days = sum.unpaidDays;
        rec.bhxh_days = sum.bhxhDays; rec.study_days = sum.studyDays;
        rec.status = newStatus; delete rec._isUnsaved;

        payloads.push({
            staff_code: rec.staff_code, month_key: monthKey, dept_code: rec.dept_code || 'BM_KTXN',
            contract_type: rec.contract_type || 'VC', days_json: rec.days_json || {},
            paid_days: sum.paidDays, unpaid_days: sum.unpaidDays, bhxh_days: sum.bhxhDays, study_days: sum.studyDays,
            status: newStatus,
            approved_by: approveStatus ? prof.staff_code : rec.approved_by,
            approved_at: approveStatus ? new Date().toISOString() : rec.approved_at
        });
    });

    if (payloads.length === 0) return window.show_toast("⚠️ Không có dữ liệu để lưu!", true);
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('staff_timesheets').upsert(payloads, { onConflict: 'staff_code,month_key' });
        if (error) throw error;
        window.render_ktyh_active_view();
        window.show_toast(approveStatus ? `✅ Đã phê duyệt bảng công Tháng ${m}/${y} (${payloads.length} cán bộ)!` : `✅ Đã lưu bảng chấm công Tháng ${m}/${y}!`);
    } catch (e) {
        window.show_toast("❌ Lỗi lưu Supabase: " + e.message, true);
    }
};

// =========================================================================
// 📥 4. NHẬP FILE Vien chuc.xlsx / HĐLĐ (CHỈ DÀNH CHO ADMIN)
// =========================================================================
window.download_ktyh_staff_excel_template = function() {
    if (typeof XLSX === 'undefined') return window.show_toast("⚠️ Chưa nạp SheetJS!", true);
    const sampleRows = [
        { "MaCB": "huyen_nvd", "HoTen": "Nguyễn Viết Diệu Huyền", "MatKhau": "123456", "BoMon": "BM_KTXN", "LoaiHD": "HDLD", "ChucVu": "ktyh_specialist", "ChamCong": "CO", "KyHieuMacDinh": "+" },
        { "MaCB": "duc_hn",    "HoTen": "Hồ Ngọc Đức",            "MatKhau": "123456", "BoMon": "BM_KTXN", "LoaiHD": "HDLD", "ChucVu": "teacher",         "ChamCong": "",   "KyHieuMacDinh": "+" }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_HDLD");
    XLSX.writeFile(wb, "Bieu_Mau_Nhap_Nhan_Su_KTYH.xlsx");
    window.show_toast("📄 Đã tải file mẫu nhập nhân sự!");
};

window.open_ktyh_staff_import_modal = function() {
    let subId = 'ktyh_staff_import_modal';
    document.getElementById(subId)?.remove();

    let html = `
    <style>
        #${subId}, #${subId} * { scrollbar-width: none !important; -ms-overflow-style: none !important; -webkit-overflow-scrolling: touch !important; }
        #${subId}::-webkit-scrollbar, #${subId} *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    </style>
    <div id="${subId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-2 p-md-3" style="background: rgba(0,0,0,0.86); z-index: 9999999; height: 100dvh; overflow: hidden;">
        <div class="ktyh-card w-100 d-flex flex-column" style="max-width: 760px; max-height: 92dvh; background: #1a1d20; border: 1px solid #10b981;">
            <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary flex-shrink-0">
                <h6 class="fw-bold text-success mb-0 text-uppercase"><i class="bi bi-cloud-upload-fill me-1"></i> [ADMIN] NHẬP HỒ SƠ VIÊN CHỨC &amp; HĐLĐ</h6>
                <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('${subId}').remove()"></button>
            </div>
            <div class="flex-grow-1 overflow-auto pe-1" style="min-height: 0; overscroll-behavior: contain; touch-action: pan-y;">
                <div class="p-3 rounded-3 mb-3" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.45);">
                    <div class="fw-bold text-success mb-1"><i class="bi bi-file-earmark-excel-fill me-1"></i> Cách 1: Tải trực tiếp file <code>Vien chuc.xlsx</code> (27 cột) hoặc file Mẫu HĐLĐ</div>
                    <div class="small text-white-50 mb-2">Tự động nhận diện 27 cột, tách Bộ môn, tạo tài khoản đăng nhập mới (MK mặc định <code>123456</code>), bảo toàn mật khẩu &amp; quyền Admin của tài khoản cũ.</div>
                    <div class="d-flex gap-2 align-items-center flex-wrap">
                        <input type="file" accept=".xlsx,.xls" class="form-control ktyh-input-sm flex-grow-1" style="height:auto!important; padding:7px!important;" onchange="window.handle_ktyh_universal_excel_upload(this)">
                        <button type="button" class="btn btn-sm btn-outline-info fw-bold" onclick="window.download_ktyh_staff_excel_template()"><i class="bi bi-download me-1"></i> Tải mẫu HĐLĐ</button>
                    </div>
                    <div id="ktyh_import_progress_msg" class="small text-warning fw-bold mt-2"></div>
                </div>
                <div class="p-3 rounded-3" style="background: #121417; border: 1px solid #2b3035;">
                    <label class="fw-bold text-warning small text-uppercase mb-1 d-block"><i class="bi bi-clipboard-plus-fill me-1"></i> Cách 2: Copy-Paste nhanh từ Excel</label>
                    <div class="text-white-50 mb-1" style="font-size: 0.72rem;">Thứ tự: <code>MaCB [Tab] HoTen [Tab] MatKhau [Tab] BoMon [Tab] LoaiHD [Tab] ChucVu [Tab] ChamCong(CO) [Tab] KyHieu</code></div>
                    <textarea id="ktyh_import_tsv_box" class="form-control ktyh-input-sm font-monospace" style="height: 120px !important;" placeholder="huyen_nvd&#9;Nguyễn Viết Diệu Huyền&#9;123456&#9;BM_KTXN&#9;HDLD&#9;ktyh_specialist&#9;CO&#9;+"></textarea>
                    <div class="text-end mt-2">
                        <button type="button" class="btn btn-sm btn-info fw-bold text-dark px-3" onclick="window.execute_ktyh_tsv_import()"><i class="bi bi-check2-all me-1"></i> Nhập từ ô Copy-Paste</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.handle_ktyh_universal_excel_upload = function(input) {
    let file = input.files && input.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') return window.show_toast("⚠️ Chưa nạp SheetJS!", true);
    let msgEl = document.getElementById('ktyh_import_progress_msg');
    if (msgEl) msgEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang xử lý file ${file.name}...`;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames.includes('VIÊN CHỨC') ? 'VIÊN CHỨC' : wb.SheetNames[0]];
            const rowsAoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rowsAoa || rowsAoa.length < 2) throw new Error("File Excel trống!");

            let headers = rowsAoa[0].map(h => String(h || '').trim());
            let isFull27 = headers.some(h => h.toLowerCase().includes('cccd') || h.toLowerCase().includes('hệ số lương') || h.toLowerCase().includes('ngạch'));

            let usedCodes = new Set((window._ktyhState.profilesList || []).map(p => String(p.staff_code).toLowerCase()));
            let existingByCccd = {}, existingByName = {};
            (window._ktyhState.profilesList || []).forEach(p => {
                if (p.cccd_number) existingByCccd[String(p.cccd_number).trim()] = p.staff_code;
                existingByName[window.clean_vn_str(p.full_name)] = p.staff_code;
            });

            let profilesToUpsert = [], usersToUpsert = [];
            if (isFull27) {
                for (let i = 1; i < rowsAoa.length; i++) {
                    let r = rowsAoa[i];
                    let fullName = String(r[1] || '').trim();
                    if (!fullName) continue;
                    let lastMiddle = String(r[2] || '').trim(), firstName = String(r[3] || '').trim();
                    if (!firstName) { let pts = fullName.split(' '); firstName = pts.pop(); lastMiddle = pts.join(' '); }

                    let cccd = String(r[7] || '').trim(), rawCode = String(r[19] || '').trim();
                    let staffCode = rawCode || (cccd && existingByCccd[cccd]) || existingByName[window.clean_vn_str(fullName)] || window.generate_unique_staff_code(fullName, usedCodes);

                    let jobPos = String(r[17] || '').trim(), unitFull = String(r[18] || '').trim();
                    let rankNgach = String(r[10] || '').trim(), major = String(r[12] || '').replace(/\n/g, ' ').trim();
                    let deptCode = window.infer_ktyh_dept_from_row(jobPos, unitFull, rankNgach, major);
                    let ktyhRole = window.infer_ktyh_role_from_row(jobPos, rankNgach);

                    profilesToUpsert.push({
                        staff_code: staffCode, full_name: fullName, last_middle_name: lastMiddle, first_name: firstName,
                        recruitment_decision: String(r[4] || '').trim(), gender: String(r[5] || '').trim(),
                        dob: window.format_excel_date_vn(r[6]), cccd_number: cccd,
                        cccd_issue_date: window.format_excel_date_vn(r[8]), cccd_issue_place: String(r[9] || '').trim(),
                        rank_ngach: rankNgach, highest_degree: String(r[11] || '').trim(), major_specialty: major,
                        graduation_year: String(r[13] || '').trim(), prior_occupation: String(r[14] || '').trim(),
                        foreign_language: String(r[15] || '').trim(), it_level: String(r[16] || '').trim(),
                        job_position: jobPos || rankNgach || 'Viên chức', unit_full_name: unitFull, employee_code: rawCode,
                        permanent_address: String(r[20] || '').trim(), phone_number: window.normalize_vn_phone(r[21]),
                        bank_account: String(r[22] || '').trim(), bank_name: String(r[23] || '').trim(),
                        salary_coefficient: String(r[24] || '').trim(), salary_step: String(r[25] || '').trim(),
                        salary_start_date: window.format_excel_date_vn(r[26]),
                        contract_type: 'VC', dept_code: deptCode, ktyh_role: ktyhRole, is_timekeeper: false, default_attendance_sym: '+'
                    });
                    usersToUpsert.push({
                        student_id: staffCode, password: '123456', full_name: fullName, role: ktyhRole,
                        nganh_hoc: window.KTYH_DEPARTMENTS[deptCode]?.short || deptCode,
                        permissions: ktyhRole === 'ktyh_dean' ? 'banks,exams,subjects,stats' : 'banks,exams,stats', status: 'active'
                    });
                }
            } else {
                const jsonRows = XLSX.utils.sheet_to_json(ws);
                jsonRows.forEach(r => {
                    let code = String(r['MaCB'] || r['Mã CB'] || r['student_id'] || '').trim();
                    let name = String(r['HoTen'] || r['Họ và tên'] || '').trim();
                    if (!code || !name) return;
                    let pts = name.split(' '), fName = pts.pop(), lmName = pts.join(' ');
                    let deptCode = window.infer_ktyh_dept_from_row('', r['BoMon'] || r['Bộ môn'] || 'BM_KTXN', '', '');
                    let ktyhRole = window.infer_ktyh_role_from_row(r['ChucVu'] || r['Chức vụ'] || 'teacher');
                    let cType = String(r['LoaiHD'] || 'HDLD').toUpperCase().includes('HD') ? 'HDLD' : 'VC';
                    let isTk = window.clean_vn_str(r['ChamCong'] || '').includes('co') || String(r['ChamCong'] || '') === '1';

                    profilesToUpsert.push({
                        staff_code: code, full_name: name, last_middle_name: lmName, first_name: fName,
                        contract_type: cType, dept_code: deptCode, ktyh_role: ktyhRole, is_timekeeper: isTk,
                        job_position: window.KTYH_ROLE_META[ktyhRole]?.short || 'Giảng viên',
                        default_attendance_sym: String(r['KyHieuMacDinh'] || '+').trim().toUpperCase() || '+'
                    });
                    usersToUpsert.push({
                        student_id: code, password: String(r['MatKhau'] || '123456').trim(), full_name: name, role: ktyhRole,
                        nganh_hoc: window.KTYH_DEPARTMENTS[deptCode]?.short || deptCode,
                        permissions: ktyhRole === 'ktyh_dean' ? 'banks,exams,subjects,stats' : 'banks,exams,stats', status: 'active'
                    });
                });
            }
            if (profilesToUpsert.length === 0) throw new Error("Không tìm thấy dòng nhân sự hợp lệ!");
            await window.commit_ktyh_staff_to_supabase(usersToUpsert, profilesToUpsert);
        } catch (err) {
            if (msgEl) msgEl.innerHTML = `<span class="text-danger">❌ Lỗi: ${err.message}</span>`;
            window.show_toast("❌ Lỗi nhập Excel: " + err.message, true);
        } finally { input.value = ''; }
    };
    reader.readAsArrayBuffer(file);
};

window.execute_ktyh_tsv_import = async function() {
    let lines = (document.getElementById('ktyh_import_tsv_box')?.value || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return window.show_toast("⚠️ Chưa có dữ liệu!", true);
    let usersArr = [], profArr = [];
    lines.forEach(line => {
        let cols = line.includes('\t') ? line.split('\t') : line.split(',');
        let code = (cols[0] || '').trim(), name = (cols[1] || '').trim();
        if (!code || !name || code.toLowerCase() === 'macb') return;
        let pts = name.split(' '), fName = pts.pop(), lmName = pts.join(' ');
        let deptCode = window.infer_ktyh_dept_from_row('', cols[3] || 'BM_KTXN', '', '');
        let cType = String(cols[4] || 'HDLD').toUpperCase().includes('HD') ? 'HDLD' : 'VC';
        let ktyhRole = window.infer_ktyh_role_from_row(cols[5] || 'teacher');
        let isTk = window.clean_vn_str(cols[6] || '').includes('co');
        let defSym = ((cols[7] || '+').trim().toUpperCase()) || '+';

        profArr.push({
            staff_code: code, full_name: name, last_middle_name: lmName, first_name: fName,
            contract_type: cType, dept_code: deptCode, ktyh_role: ktyhRole, is_timekeeper: isTk,
            job_position: window.KTYH_ROLE_META[ktyhRole]?.short || 'Giảng viên', default_attendance_sym: defSym
        });
        usersArr.push({
            student_id: code, password: (cols[2] || '').trim() || '123456', full_name: name, role: ktyhRole,
            nganh_hoc: window.KTYH_DEPARTMENTS[deptCode]?.short || deptCode, permissions: 'banks,exams,stats', status: 'active'
        });
    });
    if (profArr.length === 0) return window.show_toast("⚠️ Dữ liệu không hợp lệ!", true);
    await window.commit_ktyh_staff_to_supabase(usersArr, profArr);
};

// Tách riêng INSERT (người mới) & UPDATE (người cũ) -> Không bao giờ dính lỗi password NOT NULL
window.commit_ktyh_staff_to_supabase = async function(usersPayloads, profilesPayloads) {
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    if (!clientDb) return window.show_toast("❌ Chưa kết nối Supabase!", true);

    let uniqueUsersMap = {}, uniqueProfilesMap = {};
    usersPayloads.forEach(u => { if (u && u.student_id) uniqueUsersMap[String(u.student_id).toLowerCase()] = u; });
    profilesPayloads.forEach(p => { if (p && p.staff_code) uniqueProfilesMap[String(p.staff_code).toLowerCase()] = p; });

    let cleanUsers = Object.values(uniqueUsersMap), cleanProfiles = Object.values(uniqueProfilesMap);

    const { data: existingUsers, error: errFetch } = await clientDb.from('users').select('student_id, role');
    if (errFetch) throw errFetch;

    let existingMap = {};
    (existingUsers || []).forEach(u => { existingMap[String(u.student_id).toLowerCase()] = { rawId: u.student_id, role: u.role }; });

    let toInsert = [], toUpdate = [];
    cleanUsers.forEach(u => {
        let ex = existingMap[String(u.student_id).toLowerCase()];
        if (!ex) {
            toInsert.push({
                student_id: u.student_id,
                password: (u.password && String(u.password).trim() !== '') ? String(u.password).trim() : '123456',
                full_name: u.full_name, role: u.role || 'teacher', nganh_hoc: u.nganh_hoc || '',
                permissions: u.permissions || 'banks,exams,stats', status: u.status || 'active'
            });
        } else {
            let patchData = { full_name: u.full_name, nganh_hoc: u.nganh_hoc || '' };
            if (ex.role !== 'all' && ex.role !== 'admin') patchData.role = u.role || ex.role;
            toUpdate.push({ rawId: ex.rawId, patch: patchData });
        }
    });

    if (toInsert.length > 0) {
        const { error: errIns } = await clientDb.from('users').insert(toInsert);
        if (errIns) throw errIns;
    }
    if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map(item => clientDb.from('users').update(item.patch).eq('student_id', item.rawId)));
    }

    const { error: errP } = await clientDb.from('staff_profiles').upsert(cleanProfiles, { onConflict: 'staff_code' });
    if (errP) throw errP;

    document.getElementById('ktyh_staff_import_modal')?.remove();
    await window.load_ktyh_db_data();
    window.render_ktyh_active_view();
    window.show_toast(`✅ Đã đồng bộ ${cleanProfiles.length} hồ sơ (Mới: ${toInsert.length}, Cập nhật: ${toUpdate.length})!`);
};

// =========================================================================
// 🖥️ 5. GIAO DIỆN CHÍNH THÍCH ỨNG THEO 6 CẤP (SUPER APP + CSS CHỐNG ĐƠ)
// =========================================================================
window.open_ktyh_faculty_portal = async function() {
    window.register_ktyh_roles_to_rbac();
    window._ktyhState.previewRole = null;
    await window.load_ktyh_db_data();
    window.render_ktyh_portal_shell();
};

// Vẽ lại khung Modal (dùng khi mở lần đầu hoặc khi Admin chuyển góc nhìn Xem thử)
window.render_ktyh_portal_shell = function() {
    let prof = window.get_current_ktyh_profile();
    window._ktyhState.selectedDept = prof.perms.canViewAllDepts ? 'ALL' : prof.deptCode;
    window._ktyhState.selectedPersonCode = prof.perms.canViewTimesheetAll ? 'ALL' : prof.staff_code;
    window._ktyhState.activeTab = prof.tabs[0].id;

    let modalId = 'ktyh_faculty_portal_modal';
    document.getElementById(modalId)?.remove();

    let tabsHtml = prof.tabs.map((t, idx) => `
        <button type="button" id="ktyh_tab_${t.id}" class="ktyh-tab-btn ${idx === 0 ? 'active' : ''}" onclick="window.switch_ktyh_tab('${t.id}')">
            <i class="bi ${t.icon} me-1"></i>${t.label}
        </button>
    `).join('');

    // Thanh chọn góc nhìn Xem thử (Độc quyền cho Admin tối cao)
    let adminPreviewSwitcher = prof.isRealAdmin ? `
        <select class="form-select ktyh-input-sm text-warning border-warning" style="width:auto; min-width:175px; font-size:0.72rem!important;" onchange="window._ktyhState.previewRole = this.value || null; window.render_ktyh_portal_shell();" title="Admin xem thử giao diện của từng cấp bậc">
            <option value="" ${!window._ktyhState.previewRole ? 'selected' : ''}>👑 Góc nhìn: Admin (Tối cao)</option>
            <option value="ktyh_dean"       ${window._ktyhState.previewRole === 'ktyh_dean' ? 'selected' : ''}>👁️ Thử: Lãnh đạo Khoa</option>
            <option value="ktyh_head"       ${window._ktyhState.previewRole === 'ktyh_head' ? 'selected' : ''}>👁️ Thử: Lãnh đạo Bộ môn</option>
            <option value="ktyh_academic"   ${window._ktyhState.previewRole === 'ktyh_academic' ? 'selected' : ''}>👁️ Thử: Giáo vụ Khoa</option>
            <option value="ktyh_specialist" ${window._ktyhState.previewRole === 'ktyh_specialist' ? 'selected' : ''}>👁️ Thử: Chuyên viên Khoa</option>
            <option value="teacher"         ${window._ktyhState.previewRole === 'teacher' ? 'selected' : ''}>👁️ Thử: Giảng viên</option>
        </select>
    ` : '';

    let html = `
    <style>
        /* 🌟 CHUẨN CSS CỤC BỘ CHỐNG ĐƠ CẢM ỨNG (SINGLE-AXIS TOUCH SCROLL) */
        #${modalId}, #${modalId} * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            -webkit-overflow-scrolling: touch !important;
        }
        #${modalId}::-webkit-scrollbar, #${modalId} *::-webkit-scrollbar {
            display: none !important; width: 0 !important; height: 0 !important;
        }
        #ktyh_portal_scroll_body, .ktyh-scroll-strip, .c01-table-responsive {
            min-height: 0 !important;
            overscroll-behavior: contain !important;
            touch-action: pan-x pan-y !important;
        }
        .ktyh-card, .ktyh-card *, .c01-day-cell, .c01-cal-box, .ktyh-tab-btn {
            touch-action: pan-x pan-y manipulation !important;
        }

        .ktyh-card { background: #181b1f; border: 1px solid #2b3035; border-radius: 12px; padding: 12px; }
        .ktyh-tab-btn { border-radius: 8px; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; border: 1px solid #2b3035; background: #121417; color: #94a3b8; cursor: pointer; white-space: nowrap; transition: 0.15s; }
        .ktyh-tab-btn.active { background: #10b981; color: #052e16; border-color: #10b981; }
        .ktyh-input-sm { background: #101214 !important; border: 1px solid #2b3035 !important; color: #f8fafc !important; border-radius: 8px !important; font-size: 0.8rem !important; font-weight: 600 !important; padding: 4px 10px !important; height: 33px !important; }
        .sym-brush-pill { border-radius: 8px; padding: 4px 10px; font-size: 0.74rem; font-weight: 700; border: 1px solid #2b3035; background: #101214; color: #cbd5e1; cursor: pointer; white-space: nowrap; }
        .sym-brush-pill.active { border-color: #38bdf8; background: rgba(56, 189, 248, 0.18); color: #38bdf8; }
        .c01-grid-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .c01-grid-table th, .c01-grid-table td { border: 1px solid #2b3035; padding: 4px 3px; text-align: center; vertical-align: middle; }
        .c01-grid-table th { background: #121417; color: #cbd5e1; font-weight: 700; }
        .c01-day-cell { cursor: pointer; min-width: 26px; height: 30px; font-weight: 700; user-select: none; }
        .c01-day-cell:hover { background: rgba(56, 189, 248, 0.2) !important; }
        .c01-weekend-col { background: rgba(255, 255, 255, 0.03) !important; color: #64748b; }
        .c01-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .c01-cal-box { background: #121417; border: 1px solid #2b3035; border-radius: 10px; padding: 8px 4px; text-align: center; cursor: pointer; user-select: none; }
        .c01-cal-box.is-weekend { background: rgba(255, 255, 255, 0.02); border-style: dashed; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 999999; height: 100dvh; max-height: 100dvh; overflow: hidden;">
        
        <!-- 1. HEADER -->
        <div class="d-flex justify-content-between align-items-center py-2 px-3 border-bottom border-secondary bg-dark flex-shrink-0 flex-wrap gap-2" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button type="button" class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 border-0 bg-transparent" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-chevron-left fs-5"></i><span class="ms-1">Thoát</span>
            </button>

            <div class="d-flex align-items-center gap-2">
                <i class="bi bi-hospital-fill text-success fs-5"></i>
                <h6 class="fw-bold text-white mb-0 text-uppercase" style="font-size: 0.92rem;">KHOA KỸ THUẬT Y HỌC</h6>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                ${adminPreviewSwitcher}
                <span class="badge fw-bold px-2 py-1" style="background: ${prof.badgeColor}; color: #fff; font-size: 0.72rem;">${prof.levelTitle}</span>
                <span class="text-info fw-bold small d-none d-lg-inline">${prof.full_name}</span>
            </div>
        </div>

        <!-- 2. THANH TAB & NÚT CÔNG CỤ THEO ĐÚNG THẨM QUYỀN -->
        <div class="bg-dark border-bottom border-secondary py-2 px-2 flex-shrink-0" style="margin-left: -0.5px; margin-right: -0.5px;">
            <div class="mx-auto d-flex justify-content-between align-items-center flex-wrap gap-2" style="max-width: 1420px;">
                <div class="d-flex gap-1 overflow-auto ktyh-scroll-strip">${tabsHtml}</div>

                <div class="d-flex align-items-center gap-1 flex-wrap">
                    ${prof.perms.canImportExcel ? `
                    <button type="button" class="btn btn-sm btn-danger fw-bold py-1 px-2" style="font-size: 0.74rem;" onclick="window.open_ktyh_staff_import_modal()">
                        <i class="bi bi-cloud-upload-fill me-1"></i>Nhập Excel
                    </button>` : ''}
                    ${prof.perms.canOpenRBAC ? `
                    <button type="button" class="btn btn-sm btn-outline-warning fw-bold py-1 px-2" style="font-size: 0.74rem;" onclick="if(typeof window.open_rbac_permission_studio === 'function') window.open_rbac_permission_studio();">
                        <i class="bi bi-shield-lock-fill me-1"></i>RBAC
                    </button>` : ''}
                    ${prof.perms.canExportFullC01 ? `
                    <button type="button" class="btn btn-sm btn-success fw-bold py-1 px-2" style="font-size: 0.74rem;" onclick="window.export_c01_excel_file()">
                        <i class="bi bi-file-earmark-excel-fill me-1"></i>Excel C01-HD
                    </button>
                    <button type="button" class="btn btn-sm btn-warning fw-bold text-dark py-1 px-2" style="font-size: 0.74rem;" onclick="window.export_c01_individual_or_full_print('FULL')">
                        <i class="bi bi-printer-fill me-1"></i>In A4
                    </button>` : ''}
                    <button type="button" class="btn btn-sm btn-outline-info fw-bold py-1 px-2" style="font-size: 0.74rem;" onclick="window.export_c01_individual_or_full_print('SINGLE')">
                        <i class="bi bi-person-vcard me-1"></i>Xuất Từng Người
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. BODY CUỘN 1 TRỤC -->
        <div id="ktyh_portal_scroll_body" class="flex-grow-1 overflow-auto p-2 p-md-3">
            <div id="ktyh_portal_main_content" class="mx-auto w-100" style="max-width: 1420px;"></div>
        </div>

        <!-- 4. FOOTER TRÀN VIỀN -->
        <div class="border-top border-secondary bg-dark flex-shrink-0 d-flex w-100 mt-auto" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button type="button" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-white-50 bg-transparent border-0 border-end border-secondary" style="border-radius: 0; font-size: 0.84rem;" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-x-lg me-2"></i><span>ĐÓNG CỬA SỔ</span>
            </button>
            <button type="button" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-info bg-transparent border-0 ${prof.perms.canApproveTimesheet ? 'border-end border-secondary' : ''}" style="border-radius: 0; font-size: 0.84rem;" onclick="window.save_ktyh_timesheets_to_db(window._ktyhState.selectedPersonCode !== 'ALL' ? window._ktyhState.selectedPersonCode : null, null)">
                <i class="bi bi-floppy-fill me-2"></i><span>LƯU CHẤM CÔNG</span>
            </button>
            ${prof.perms.canApproveTimesheet ? `
            <button type="button" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-success bg-transparent border-0" style="border-radius: 0; font-size: 0.84rem;" onclick="window.save_ktyh_timesheets_to_db(null, '${prof.activeRole === 'ktyh_head' ? 'head_approved' : 'dean_approved'}')">
                <i class="bi bi-patch-check-fill me-2"></i><span>${prof.activeRole === 'ktyh_head' ? 'BỘ MÔN DUYỆT CÔNG' : 'KHOA DUYỆT CÔNG'}</span>
            </button>` : ''}
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    window.render_ktyh_active_view();
};

window.switch_ktyh_tab = function(tabName) {
    window._ktyhState.activeTab = tabName;
    let prof = window.get_current_ktyh_profile();
    prof.tabs.forEach(t => {
        document.getElementById('ktyh_tab_' + t.id)?.classList.toggle('active', t.id === tabName);
    });
    window.render_ktyh_active_view();
};

window.render_ktyh_active_view = function() {
    let box = document.getElementById('ktyh_portal_main_content');
    if (!box) return;
    let prof = window.get_current_ktyh_profile();
    let tab = window._ktyhState.activeTab;

    if (tab === 'overview') window.render_ktyh_overview_tab(box, prof);
    else if (tab === 'timesheet') window.render_ktyh_timesheet_tab(box, prof);
    else if (tab === 'profiles') window.render_ktyh_profiles_tab(box, prof);
    else window.render_ktyh_subjects_exams_tab(box, prof);
};

// =========================================================================
// 📊 6. DASHBOARD ĐIỀU HÀNH (BIỂU ĐỒ SVG + XUẤT EXCEL CHO LÃNH ĐẠO KHOA & BỘ MÔN)
// =========================================================================
window.render_ktyh_overview_tab = function(box, prof) {
    let allList = window._ktyhState.profilesList || [];
    let isDeptScoped = !prof.perms.canViewAllDepts;
    let scopeDept = isDeptScoped ? prof.deptCode : 'ALL';
    let scopedList = isDeptScoped ? allList.filter(x => x.dept_code === prof.deptCode) : allList;

    let totalStaff = scopedList.length;
    let vcCount = scopedList.filter(x => x.contract_type === 'VC').length;
    let hdCount = scopedList.filter(x => x.contract_type === 'HDLD').length;
    let upgradeDueCount = prof.perms.canViewSensitive
        ? scopedList.filter(x => window.check_salary_upgrade_status(x.salary_start_date)).length : 0;

    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthKey = `${y}_${String(m).padStart(2, '0')}`;
    let monthMap = window._ktyhState.timesheetMap[monthKey] || {};

    // Thống kê trạng thái chấm công tháng hiện tại trong phạm vi đang xem
    let tsCounts = { dean_approved: 0, head_approved: 0, submitted: 0, draft: 0 };
    scopedList.forEach(st => {
        let s = monthMap[st.staff_code]?.status || 'draft';
        if (tsCounts[s] !== undefined) tsCounts[s]++;
        else tsCounts.draft++;
    });
    let approvedCount = tsCounts.dean_approved + tsCounts.head_approved;
    let approvedPct = totalStaff > 0 ? Math.round((approvedCount / totalStaff) * 100) : 0;

    // 1. TÍNH DỮ LIỆU BIỂU ĐỒ TRÒN (SVG DONUT): CƠ CẤU TRÌNH ĐỘ CHUYÊN MÔN
    let degBuckets = [
        { label: 'Tiến sĩ',          color: '#f43f5e', count: 0 },
        { label: 'Thạc sĩ',          color: '#38bdf8', count: 0 },
        { label: 'Chuyên khoa I',    color: '#a855f7', count: 0 },
        { label: 'Đại học / Cử nhân',color: '#10b981', count: 0 },
        { label: 'Khác / Chưa rõ',   color: '#64748b', count: 0 }
    ];
    scopedList.forEach(st => {
        let d = window.clean_vn_str(st.highest_degree || '');
        if (d.includes('tien s')) degBuckets[0].count++;
        else if (d.includes('thac s')) degBuckets[1].count++;
        else if (d.includes('ck')) degBuckets[2].count++;
        else if (d.includes('dai hoc') || d.includes('cu nhan')) degBuckets[3].count++;
        else degBuckets[4].count++;
    });

    // Vẽ các cung tròn SVG (chu vi = 100, r = 15.9155)
    let cumPct = 0;
    let donutSegmentsHtml = degBuckets.map(b => {
        if (b.count === 0 || totalStaff === 0) return '';
        let pct = (b.count / totalStaff) * 100;
        let offset = 100 - cumPct + 25;
        cumPct += pct;
        return `<circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="${b.color}" stroke-width="5.2" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>`;
    }).join('');

    let donutLegendHtml = degBuckets.map(b => {
        let pct = totalStaff > 0 ? Math.round((b.count / totalStaff) * 100) : 0;
        return `
        <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-secondary border-opacity-25" style="font-size:0.78rem;">
            <div class="d-flex align-items-center gap-2">
                <span style="width:10px; height:10px; border-radius:3px; background:${b.color}; display:inline-block;"></span>
                <span class="text-light">${b.label}</span>
            </div>
            <div><b class="text-white">${b.count}</b> <span class="text-white-50">(${pct}%)</span></div>
        </div>`;
    }).join('');

    // 2. TÍNH DỮ LIỆU BIỂU ĐỒ CỘT NGANG:
    // - Admin / Lãnh đạo Khoa: Phân bổ nhân sự & tiến độ duyệt công theo 6 Đơn vị
    // - Lãnh đạo Bộ môn: Chi tiết tiến độ chấm công tháng hiện tại trong Bộ môn
    let rightChartTitle = isDeptScoped
        ? `TIẾN ĐỘ CHẤM CÔNG THÁNG ${String(m).padStart(2,'0')}/${y} (${window.KTYH_DEPARTMENTS[prof.deptCode]?.short || prof.deptCode})`
        : `PHÂN BỔ NHÂN SỰ & DUYỆT CÔNG THEO BỘ MÔN (T${String(m).padStart(2,'0')}/${y})`;

    let rightChartBarsHtml = '';
    if (!isDeptScoped) {
        let maxDept = Math.max(1, ...Object.keys(window.KTYH_DEPARTMENTS).map(k => allList.filter(x => x.dept_code === k).length));
        rightChartBarsHtml = Object.values(window.KTYH_DEPARTMENTS).map(d => {
            let dList = allList.filter(x => x.dept_code === d.code);
            let dApproved = dList.filter(x => ['dean_approved', 'head_approved'].includes(monthMap[x.staff_code]?.status)).length;
            let barW = Math.round((dList.length / maxDept) * 100);
            let appW = dList.length > 0 ? Math.round((dApproved / dList.length) * 100) : 0;
            return `
            <div class="mb-2" style="cursor:pointer;" onclick="window._ktyhState.selectedDept='${d.code}'; window.switch_ktyh_tab('timesheet')" title="Bấm để mở chấm công ${d.name}">
                <div class="d-flex justify-content-between align-items-center mb-1" style="font-size:0.76rem;">
                    <span class="fw-bold text-white"><i class="bi ${d.icon} me-1" style="color:${d.color};"></i>${d.short}</span>
                    <span class="text-white-50"><b class="text-white">${dList.length}</b> người • Đã duyệt: <b class="text-success">${dApproved}/${dList.length}</b> (${appW}%)</span>
                </div>
                <div style="height:10px; background:#0f172a; border-radius:999px; overflow:hidden; border:1px solid #262b31;">
                    <div style="width:${barW}%; height:100%; background:linear-gradient(90deg, ${d.color}, #38bdf8); border-radius:999px; transition:width 0.4s ease;"></div>
                </div>
            </div>`;
        }).join('');
    } else {
        const statusBars = [
            { label: '🏛️ Khoa đã phê duyệt',  count: tsCounts.dean_approved, color: '#10b981' },
            { label: '🔬 Bộ môn đã phê duyệt', count: tsCounts.head_approved, color: '#38bdf8' },
            { label: '✍️ Giảng viên đã tự chấm', count: tsCounts.submitted,    color: '#f59e0b' },
            { label: '⏳ Chưa lưu / Nháp',      count: tsCounts.draft,         color: '#64748b' }
        ];
        rightChartBarsHtml = statusBars.map(sb => {
            let pct = totalStaff > 0 ? Math.round((sb.count / totalStaff) * 100) : 0;
            return `
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1" style="font-size:0.78rem;">
                    <span class="fw-bold text-light">${sb.label}</span>
                    <span class="text-white-50"><b class="text-white">${sb.count}</b> / ${totalStaff} (${pct}%)</span>
                </div>
                <div style="height:11px; background:#0f172a; border-radius:999px; overflow:hidden; border:1px solid #262b31;">
                    <div style="width:${pct}%; height:100%; background:${sb.color}; border-radius:999px; transition:width 0.4s ease;"></div>
                </div>
            </div>`;
        }).join('') + `
        <div class="mt-3 pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between small text-white-50">
            <span>Cơ cấu hợp đồng: <b class="text-info">Viên chức (${vcCount})</b> • <b class="text-warning">HĐLĐ (${hdCount})</b></span>
            <button class="btn btn-sm py-0 px-2 btn-outline-success fw-bold" style="font-size:0.72rem;" onclick="window.switch_ktyh_tab('timesheet')">Mở lưới 31 ngày →</button>
        </div>`;
    }

    // 3. KHỐI THẺ BỘ MÔN (LÃNH ĐẠO KHOA) HOẶC LỐI TẮT NHÂN SỰ (LÃNH ĐẠO BỘ MÔN)
    let bottomGridHtml = !isDeptScoped ? `
        <div class="row g-2">
            ${Object.values(window.KTYH_DEPARTMENTS).map(d => {
                let dList = allList.filter(x => x.dept_code === d.code);
                let head = dList.find(x => x.ktyh_role === 'ktyh_head');
                return `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="ktyh-card h-100 d-flex flex-column justify-content-between" style="border-left: 4px solid ${d.color};">
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="badge bg-dark border border-secondary text-white-50">${d.short}</span>
                                <i class="bi ${d.icon} fs-5" style="color:${d.color};"></i>
                            </div>
                            <div class="fw-bold text-white" style="font-size:0.9rem;">${d.name}</div>
                            <div class="text-white-50 small mt-1">Phụ trách: <b class="text-info">${head ? head.full_name : 'Chưa gán Trưởng BM'}</b></div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-secondary border-opacity-25">
                            <span class="small text-white-50"><i class="bi bi-people me-1"></i><b>${dList.length}</b> nhân sự</span>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm py-0 px-2 btn-outline-success fw-bold" style="font-size:0.7rem;" onclick="window._ktyhState.selectedDept='${d.code}'; window.switch_ktyh_tab('timesheet')">Chấm công</button>
                                <button class="btn btn-sm py-0 px-2 btn-outline-info fw-bold" style="font-size:0.7rem;" onclick="window._ktyhState.selectedDept='${d.code}'; window.switch_ktyh_tab('profiles')">Nhân sự</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>` : '';

    box.innerHTML = `
        <!-- Banner Chào + Cụm Nút Xuất Excel Nhanh -->
        <div class="ktyh-card mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style="background: linear-gradient(135deg, #111827 0%, #1e293b 100%); border-color: ${prof.badgeColor};">
            <div>
                <div class="fw-bold text-white">${prof.levelTitle} — <span class="text-warning">${prof.full_name}</span></div>
                <div class="text-white-50 small mt-1">
                    Phạm vi điều hành: <b class="text-info">${isDeptScoped ? prof.deptName : 'Toàn Khoa Kỹ thuật Y học'}</b> • Kỳ báo cáo: <b>Tháng ${String(m).padStart(2,'0')}/${y}</b>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <button type="button" class="btn btn-sm btn-success fw-bold px-3" onclick="window.export_c01_excel_file()">
                    <i class="bi bi-file-earmark-excel-fill me-1"></i> Xuất Excel Chấm công (C01-HD)
                </button>
                <button type="button" class="btn btn-sm btn-info fw-bold text-dark px-3" onclick="window.export_ktyh_staff_profiles_excel()">
                    <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Xuất Excel Danh sách Nhân sự
                </button>
                ${prof.perms.canImportExcel && allList.length === 0 ? `
                <button type="button" class="btn btn-sm btn-warning fw-bold text-dark px-3" onclick="window.open_ktyh_staff_import_modal()">
                    <i class="bi bi-cloud-upload-fill me-1"></i> Nhập Vien chuc.xlsx
                </button>` : ''}
            </div>
        </div>

        <!-- 4 Thẻ KPI Tổng hợp -->
        <div class="row g-2 mb-3">
            <div class="col-6 col-md-3">
                <div class="ktyh-card" style="border-top: 3px solid #38bdf8;">
                    <div class="text-white-50 small fw-bold">TỔNG NHÂN SỰ</div>
                    <div class="fs-4 fw-bold text-info mt-1">${totalStaff} người</div>
                    <div class="small text-white-50">VC: ${vcCount} • HĐLĐ: ${hdCount}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ktyh-card" style="border-top: 3px solid #10b981;">
                    <div class="text-white-50 small fw-bold">DUYỆT CÔNG T${String(m).padStart(2,'0')}/${y}</div>
                    <div class="fs-4 fw-bold text-success mt-1">${approvedCount}/${totalStaff} <span class="fs-6">(${approvedPct}%)</span></div>
                    <div class="small text-white-50">GV tự chấm: ${tsCounts.submitted} • Nháp: ${tsCounts.draft}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ktyh-card" style="border-top: 3px solid #f59e0b;">
                    <div class="text-white-50 small fw-bold">${prof.perms.canViewSensitive ? 'NÂNG BẬC LƯƠNG' : 'SAU ĐẠI HỌC (TS/ThS/CKI)'}</div>
                    <div class="fs-4 fw-bold text-warning mt-1">${prof.perms.canViewSensitive ? upgradeDueCount + ' người' : (degBuckets[0].count + degBuckets[1].count + degBuckets[2].count) + ' người'}</div>
                    <div class="small text-white-50">${prof.perms.canViewSensitive ? 'Sắp / Đến hạn 3 năm' : `Chiếm ${totalStaff > 0 ? Math.round(((degBuckets[0].count + degBuckets[1].count + degBuckets[2].count)/totalStaff)*100) : 0}% nhân sự`}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ktyh-card" style="border-top: 3px solid #f43f5e;">
                    <div class="text-white-50 small fw-bold">HỌC PHẦN CHUYÊN MÔN</div>
                    <div class="fs-4 fw-bold text-danger mt-1">${Object.keys(window.subjectConfig || {}).length} môn</div>
                    <div class="small text-white-50">Ngân hàng câu hỏi &amp; Đề thi</div>
                </div>
            </div>
        </div>

        <!-- Hàng 2 Biểu đồ Trực quan (SVG Donut + Thanh Tiến độ/Bộ môn) -->
        <div class="row g-2 mb-3">
            <div class="col-12 col-lg-5">
                <div class="ktyh-card h-100">
                    <div class="fw-bold text-info small text-uppercase mb-3">
                        <i class="bi bi-pie-chart-fill me-1"></i> CƠ CẤU TRÌNH ĐỘ CHUYÊN MÔN
                    </div>
                    <div class="row align-items-center g-2">
                        <div class="col-5 text-center">
                            <svg viewBox="0 0 42 42" style="width: 145px; max-width: 100%; height: auto;">
                                <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#1e293b" stroke-width="5.2"></circle>
                                ${donutSegmentsHtml}
                                <text x="21" y="20.2" text-anchor="middle" fill="#ffffff" font-size="6.5" font-weight="bold">${totalStaff}</text>
                                <text x="21" y="25.2" text-anchor="middle" fill="#94a3b8" font-size="2.7">NHÂN SỰ</text>
                            </svg>
                        </div>
                        <div class="col-7">
                            ${donutLegendHtml}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-7">
                <div class="ktyh-card h-100">
                    <div class="fw-bold text-warning small text-uppercase mb-3">
                        <i class="bi bi-bar-chart-steps me-1"></i> ${rightChartTitle}
                    </div>
                    ${rightChartBarsHtml}
                </div>
            </div>
        </div>

        ${bottomGridHtml}
    `;
};

// Hàm Xuất Excel Danh sách Nhân sự (Tự động lọc theo quyền: Admin/Lãnh đạo Khoa xuất đủ 27 cột; Lãnh đạo BM xuất danh bạ chuẩn, ẩn CCCD/STK/Lương)
window.export_ktyh_staff_profiles_excel = function() {
    if (typeof XLSX === 'undefined') return window.show_toast("⚠️ Thư viện SheetJS chưa sẵn sàng!", true);
    let allList = window._ktyhState.profilesList || [];
    if (allList.length === 0) return window.show_toast("⚠️ Chưa có dữ liệu nhân sự để xuất!", true);

    let prof = window.get_current_ktyh_profile();
    let deptFilter = prof.perms.canViewAllDepts ? (window._ktyhState.selectedDept || 'ALL') : prof.deptCode;
    let scoped = deptFilter === 'ALL' ? allList : allList.filter(x => x.dept_code === deptFilter);
    if (scoped.length === 0) return window.show_toast("⚠️ Không có nhân sự nào trong đơn vị đang chọn!", true);

    let includeSensitive = prof.perms.canViewSensitive;
    let rows = scoped.map((st, idx) => {
        let baseRow = {
            "STT": idx + 1,
            "Mã CB": st.staff_code,
            "Họ và tên": st.full_name,
            "Giới tính": st.gender || '',
            "Ngày sinh": st.dob || '',
            "Loại HĐ": st.contract_type || 'VC',
            "Bộ môn / Đơn vị": window.KTYH_DEPARTMENTS[st.dept_code]?.name || st.dept_code,
            "Chức vụ": st.job_position || '',
            "Ngạch": st.rank_ngach || '',
            "Trình độ cao nhất": st.highest_degree || '',
            "Chuyên ngành": st.major_specialty || '',
            "Năm TN": st.graduation_year || '',
            "Ngoại ngữ": st.foreign_language || '',
            "Tin học": st.it_level || '',
            "Số điện thoại": st.phone_number || '',
            "Đơn vị công tác đầy đủ": st.unit_full_name || ''
        };
        if (includeSensitive) {
            baseRow["Số QĐ tuyển dụng"] = st.recruitment_decision || '';
            baseRow["Số CCCD"] = st.cccd_number || '';
            baseRow["Ngày cấp CCCD"] = st.cccd_issue_date || '';
            baseRow["Nơi cấp CCCD"] = st.cccd_issue_place || '';
            baseRow["Địa chỉ thường trú"] = st.permanent_address || '';
            baseRow["Số tài khoản"] = st.bank_account || '';
            baseRow["Ngân hàng"] = st.bank_name || '';
            baseRow["Hệ số lương"] = st.salary_coefficient || '';
            baseRow["Bậc lương"] = st.salary_step || '';
            baseRow["Ngày bắt đầu hưởng lương"] = st.salary_start_date || '';
        }
        return baseRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: k.includes('Họ và tên') || k.includes('Đơn vị') || k.includes('Địa chỉ') ? 28 : 16 }));
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach_NhanSu");
    XLSX.writeFile(wb, `Nhan_Su_KTYH_${deptFilter}_${new Date().toISOString().slice(0,10)}.xlsx`);
    window.show_toast(`✅ Đã xuất Excel danh sách ${rows.length} nhân sự (${includeSensitive ? 'Đầy đủ 26 cột' : 'Danh bạ Bộ môn'})!`);
};

// =========================================================================
// 📅 7. TAB CHẤM CÔNG MẪU C01-HD (PHÂN QUYỀN CHẶT THEO 6 TẦNG)
// =========================================================================
window.render_ktyh_timesheet_tab = function(box, prof) {
    let list = window._ktyhState.profilesList || [];
    if (list.length === 0) {
        box.innerHTML = `<div class="ktyh-card text-center py-5 text-white-50">Chưa có dữ liệu nhân sự trên Supabase.${prof.perms.canImportExcel ? ' Bấm nút <b>Nhập Excel</b> ở góc trên để tải file <code>Vien chuc.xlsx</code>.' : ''}</div>`;
        return;
    }

    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthKey = `${y}_${String(m).padStart(2, '0')}`;
    let monthMap = window._ktyhState.timesheetMap[monthKey] || {};
    let numDays = window.get_days_in_month(m, y);

    let deptFilter = prof.perms.canViewAllDepts ? (window._ktyhState.selectedDept || 'ALL') : prof.deptCode;
    let cFilter = window._ktyhState.contractFilter || 'ALL';
    let q = (window._ktyhState.searchQuery || '').trim();

    let scopedList = list.filter(st => {
        if (deptFilter !== 'ALL' && st.dept_code !== deptFilter) return false;
        if (cFilter !== 'ALL' && st.contract_type !== cFilter) return false;
        if (q && !window.clean_vn_str(`${st.staff_code} ${st.full_name}`).includes(window.clean_vn_str(q))) return false;
        return true;
    });

    let selectedPerson = prof.perms.canViewTimesheetAll ? window._ktyhState.selectedPersonCode : prof.staff_code;

    let deptOpts = prof.perms.canViewAllDepts
        ? `<option value="ALL" ${deptFilter === 'ALL' ? 'selected' : ''}>🏛️ Toàn Khoa (${list.length})</option>` +
          Object.values(window.KTYH_DEPARTMENTS).map(d => `<option value="${d.code}" ${deptFilter === d.code ? 'selected' : ''}>${d.short}</option>`).join('')
        : `<option value="${prof.deptCode}" selected>🔒 ${window.KTYH_DEPARTMENTS[prof.deptCode]?.short || prof.deptCode}</option>`;

    let personOpts = prof.perms.canViewTimesheetAll
        ? `<option value="ALL" ${selectedPerson === 'ALL' ? 'selected' : ''}>📋 Bảng tổng hợp (${scopedList.length} người)</option>` +
          scopedList.map((st, i) => `<option value="${st.staff_code}" ${selectedPerson === st.staff_code ? 'selected' : ''}>👤 ${i + 1}. ${st.full_name} (${st.contract_type})</option>`).join('')
        : `<option value="${prof.staff_code}" selected>👤 ${prof.full_name} (Cá nhân)</option>`;

    let monthOpts = '';
    for (let i = 1; i <= 12; i++) monthOpts += `<option value="${i}" ${m === i ? 'selected' : ''}>Tháng ${String(i).padStart(2, '0')} / ${y}</option>`;

    let activeSym = window._ktyhState.activeBrushSymbol;
    let brushHtml = Object.values(window.KTYH_ATTENDANCE_SYMBOLS).map(s => `
        <span class="sym-brush-pill ${activeSym === s.code ? 'active' : ''}" onclick="window._ktyhState.activeBrushSymbol='${s.code}'; window.render_ktyh_active_view();" title="${s.desc}">${s.label}</span>
    `).join('');

    let bodyHtml = '';
    if (selectedPerson !== 'ALL') {
        let stObj = list.find(x => x.staff_code.toLowerCase() === String(selectedPerson).toLowerCase()) || scopedList[0];
        if (!stObj) {
            bodyHtml = `<div class="ktyh-card text-center text-white-50 py-4">Tài khoản <b>${prof.full_name}</b> chưa được gắn hồ sơ chấm công trong bảng <code>staff_profiles</code>.</div>`;
        } else {
            let rec = monthMap[stObj.staff_code];
            let daysObj = (rec && rec.days_json) ? rec.days_json : window.generate_default_days_json(stObj.default_attendance_sym || '+', m, y);
            let sum = window.calculate_c01_summary_counts(daysObj, numDays);
            let firstDow = new Date(y, m - 1, 1).getDay(), blanks = (firstDow === 0) ? 6 : (firstDow - 1);

            let calHtml = '';
            for (let b = 0; b < blanks; b++) calHtml += `<div class="c01-cal-box opacity-25" style="pointer-events:none;"></div>`;
            for (let d = 1; d <= numDays; d++) {
                let w = window.get_day_of_week_info(d, m, y);
                let curSym = daysObj[d] !== undefined ? daysObj[d] : '';
                let meta = window.KTYH_ATTENDANCE_SYMBOLS[curSym] || window.KTYH_ATTENDANCE_SYMBOLS[''];
                calHtml += `
                <div class="c01-cal-box ${w.isWeekend ? 'is-weekend' : ''}" onclick="window.toggle_single_day_attendance('${stObj.staff_code}', ${d})">
                    <div class="d-flex justify-content-between align-items-center px-1 mb-1">
                        <span class="fw-bold ${w.isWeekend ? 'text-danger' : 'text-white-50'}" style="font-size:0.7rem;">${w.label}</span>
                        <span class="fw-bold text-white" style="font-size:0.85rem;">${d}</span>
                    </div>
                    <div class="badge ${meta.badge} w-100 py-1" style="font-size:0.8rem;">${curSym || 'Nghỉ'}</div>
                </div>`;
            }

            let stLabel = rec?.status === 'dean_approved' ? 'Khoa đã duyệt' : (rec?.status === 'head_approved' ? 'BM đã duyệt' : (rec?.status === 'submitted' ? 'Đã tự chấm' : 'Nháp'));
            bodyHtml = `
            <div class="ktyh-card">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-2 mb-3 border-bottom border-secondary">
                    <div>
                        <span class="badge ${stObj.contract_type === 'VC' ? 'bg-info text-dark' : 'bg-warning text-dark'} me-1">${stObj.contract_type}</span>
                        <span class="fw-bold text-white fs-5">${stObj.full_name}</span>
                        <span class="badge bg-success ms-2">${stLabel}</span>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                        <button class="btn btn-sm btn-success fw-bold" style="font-size:0.74rem;" onclick="window.quick_fill_staff_month('${stObj.staff_code}', '+')"><i class="bi bi-magic me-1"></i>Chấm nhanh (+)</button>
                        <button class="btn btn-sm btn-info fw-bold text-dark" style="font-size:0.74rem;" onclick="window.quick_fill_staff_month('${stObj.staff_code}', 'HT')"><i class="bi bi-mortarboard-fill me-1"></i>Đi học (HT)</button>
                        <button class="btn btn-sm btn-outline-warning fw-bold" style="font-size:0.74rem;" onclick="window.export_c01_individual_or_full_print('SINGLE', '${stObj.staff_code}')"><i class="bi bi-printer-fill me-1"></i>Xuất Phiếu Cá Nhân</button>
                    </div>
                </div>
                <div class="row g-2 mb-3 text-center">
                    <div class="col-4"><div class="p-2 rounded-3" style="background:#101214; border:1px solid rgba(16,185,129,0.4);"><div class="text-white-50" style="font-size:0.68rem;">CÔNG LƯƠNG TG (32)</div><div class="fw-bold text-success fs-4">${sum.paidDays}</div></div></div>
                    <div class="col-4"><div class="p-2 rounded-3" style="background:#101214; border:1px solid rgba(148,163,184,0.3);"><div class="text-white-50" style="font-size:0.68rem;">KHÔNG LƯƠNG (33)</div><div class="fw-bold text-warning fs-4">${sum.unpaidDays}</div></div></div>
                    <div class="col-4"><div class="p-2 rounded-3" style="background:#101214; border:1px solid rgba(239,68,68,0.35);"><div class="text-white-50" style="font-size:0.68rem;">HƯỞNG BHXH (34)</div><div class="fw-bold text-danger fs-4">${sum.bhxhDays}</div></div></div>
                </div>
                <div class="c01-cal-grid">${calHtml}</div>
            </div>`;
        }
    } else {
        let dayHeaders = '', dowHeaders = '';
        for (let d = 1; d <= numDays; d++) {
            let w = window.get_day_of_week_info(d, m, y);
            dayHeaders += `<th class="${w.isWeekend ? 'c01-weekend-col' : ''}">${d}</th>`;
            dowHeaders += `<th class="${w.isWeekend ? 'c01-weekend-col text-danger' : 'text-white-50'}" style="font-size:0.62rem;">${w.label}</th>`;
        }
        let rowsHtml = scopedList.map((st, idx) => {
            let daysObj = monthMap[st.staff_code]?.days_json || {};
            let sum = window.calculate_c01_summary_counts(daysObj, numDays);
            let cells = '';
            for (let d = 1; d <= numDays; d++) {
                let w = window.get_day_of_week_info(d, m, y);
                let sym = daysObj[d] || '';
                let clr = sym === '+' ? 'color:#4ade80;' : (sym === 'HT' ? 'color:#38bdf8;' : (sym ? 'color:#fbbf24;' : 'color:#64748b;'));
                cells += `<td class="c01-day-cell ${w.isWeekend ? 'c01-weekend-col' : ''}" style="${clr}" onclick="window.toggle_single_day_attendance('${st.staff_code}', ${d})">${sym}</td>`;
            }
            return `
            <tr>
                <td class="text-white-50 fw-bold">${idx + 1}</td>
                <td class="text-start px-2" style="min-width:195px; white-space:nowrap;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-white" style="cursor:pointer;" onclick="window._ktyhState.selectedPersonCode='${st.staff_code}'; window.render_ktyh_active_view();">${st.full_name}</span>
                        <button class="btn btn-sm py-0 px-1 btn-outline-info ms-1" style="font-size:0.62rem;" onclick="window.export_c01_individual_or_full_print('SINGLE', '${st.staff_code}')"><i class="bi bi-printer"></i> Xuất</button>
                    </div>
                </td>
                <td><span class="badge ${st.contract_type === 'VC' ? 'bg-info text-dark' : 'bg-warning text-dark'}" style="font-size:0.6rem;">${st.contract_type}</span></td>
                ${cells}
                <td class="fw-bold text-success">${sum.paidDays}</td>
                <td class="fw-bold text-warning">${sum.unpaidDays || ''}</td>
                <td class="fw-bold text-danger">${sum.bhxhDays || ''}</td>
            </tr>`;
        }).join('');

        bodyHtml = `
        <div class="ktyh-card">
            <div class="table-responsive c01-table-responsive">
                <table class="c01-grid-table">
                    <thead>
                        <tr><th rowspan="2" style="width:30px;">TT</th><th rowspan="2">Họ và tên</th><th rowspan="2" style="width:42px;">Loại</th><th colspan="${numDays}">Ngày trong tháng (${String(m).padStart(2, '0')}/${y})</th><th rowspan="2" style="width:48px;">Công<br>TG</th><th rowspan="2" style="width:44px;">Không<br>lương</th><th rowspan="2" style="width:44px;">BHXH</th></tr>
                        <tr>${dayHeaders}</tr>
                        <tr><th>A</th><th>B</th><th>C</th>${dowHeaders}<th>32</th><th>33</th><th>34</th></tr>
                    </thead>
                    <tbody>${rowsHtml || '<tr><td colspan="40" class="py-4 text-white-50">Không có dữ liệu.</td></tr>'}</tbody>
                </table>
            </div>
        </div>`;
    }

    box.innerHTML = `
        <div class="ktyh-card mb-2 py-2">
            <div class="row g-2 align-items-center">
                <div class="col-6 col-md-2"><label class="text-white-50 fw-bold" style="font-size:0.65rem;">THÁNG / NĂM</label><select class="form-select ktyh-input-sm text-warning" onchange="window._ktyhState.selectedMonth=parseInt(this.value); window.load_ktyh_db_data().then(()=>window.render_ktyh_active_view());">${monthOpts}</select></div>
                ${prof.perms.canViewTimesheetAll ? `
                <div class="col-6 col-md-2"><label class="text-white-50 fw-bold" style="font-size:0.65rem;">BỘ MÔN / ĐƠN VỊ</label><select class="form-select ktyh-input-sm text-info" ${!prof.perms.canViewAllDepts ? 'disabled' : ''} onchange="window._ktyhState.selectedDept=this.value; window._ktyhState.selectedPersonCode='ALL'; window.render_ktyh_active_view();">${deptOpts}</select></div>
                <div class="col-6 col-md-2"><label class="text-white-50 fw-bold" style="font-size:0.65rem;">NHÓM SHEET</label><select class="form-select ktyh-input-sm" onchange="window._ktyhState.contractFilter=this.value; window.render_ktyh_active_view();"><option value="ALL" ${cFilter === 'ALL' ? 'selected' : ''}>VC + HĐLĐ</option><option value="VC" ${cFilter === 'VC' ? 'selected' : ''}>Viên chức (VC.)</option><option value="HDLD" ${cFilter === 'HDLD' ? 'selected' : ''}>Hợp đồng (HĐLĐ)</option></select></div>
                <div class="col-6 col-md-3"><label class="text-white-50 fw-bold" style="font-size:0.65rem;">CHỌN TỪNG CÁ NHÂN</label><select class="form-select ktyh-input-sm text-success" onchange="window._ktyhState.selectedPersonCode=this.value; window.render_ktyh_active_view();">${personOpts}</select></div>
                <div class="col-12 col-md-3"><label class="text-white-50 fw-bold" style="font-size:0.65rem;">TÌM KIẾM NHANH</label><input type="text" class="form-control ktyh-input-sm" placeholder="Nhập tên cán bộ..." value="${q}" oninput="window._ktyhState.searchQuery=this.value; window.render_ktyh_active_view();"></div>` : ''}
            </div>
            <div class="d-flex align-items-center gap-1 overflow-auto ktyh-scroll-strip pt-2 mt-2 border-top border-secondary border-opacity-25">
                <span class="text-warning fw-bold small me-1 flex-shrink-0" style="font-size:0.72rem;"><i class="bi bi-brush-fill me-1"></i>Ký hiệu chấm:</span>
                ${brushHtml}
            </div>
        </div>
        ${bodyHtml}
    `;
};

window.toggle_single_day_attendance = function(staffCode, dayNum) {
    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let rec = window._ktyhState.timesheetMap[`${y}_${String(m).padStart(2, '0')}`]?.[staffCode];
    if (!rec) return;
    let brush = window._ktyhState.activeBrushSymbol;
    rec.days_json[dayNum] = (rec.days_json[dayNum] === brush) ? '' : brush;
    window.render_ktyh_active_view();
};

window.quick_fill_staff_month = function(staffCode, sym) {
    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let rec = window._ktyhState.timesheetMap[`${y}_${String(m).padStart(2, '0')}`]?.[staffCode];
    if (!rec) return;
    rec.days_json = window.generate_default_days_json(sym, m, y);
    window.save_ktyh_timesheets_to_db(staffCode, null);
};

// =========================================================================
// 👤 8. TAB HỒ SƠ NHÂN SỰ (ẨN LƯƠNG/CCCD/STK VỚI CẤP KHÔNG CÓ THẨM QUYỀN)
// =========================================================================
window.render_ktyh_profiles_tab = function(box, prof) {
    let list = window._ktyhState.profilesList || [];
    let deptFilter = prof.perms.canViewAllDepts ? (window._ktyhState.selectedDept || 'ALL') : prof.deptCode;
    let degFilter = window._ktyhState.degreeFilter || 'ALL';
    let q = (window._ktyhState.searchQuery || '').trim();

    let filtered = list.filter(st => {
        if (prof.perms.isPersonalOnly && st.staff_code !== prof.staff_code) return false;
        if (!prof.perms.isPersonalOnly && deptFilter !== 'ALL' && st.dept_code !== deptFilter) return false;
        if (degFilter !== 'ALL') {
            let deg = window.clean_vn_str(st.highest_degree || '');
            if (degFilter === 'TS' && !deg.includes('tien s')) return false;
            if (degFilter === 'THS' && !deg.includes('thac s')) return false;
            if (degFilter === 'CKI' && !deg.includes('ck')) return false;
            if (degFilter === 'DH' && !(deg.includes('dai hoc') || deg.includes('cu nhan'))) return false;
        }
        if (q && !window.clean_vn_str(`${st.staff_code} ${st.full_name} ${st.phone_number || ''} ${st.major_specialty || ''}`).includes(window.clean_vn_str(q))) return false;
        return true;
    });

    let deptOpts = prof.perms.canViewAllDepts
        ? `<option value="ALL" ${deptFilter === 'ALL' ? 'selected' : ''}>🏛️ Tất cả Đơn vị (${list.length})</option>` +
          Object.values(window.KTYH_DEPARTMENTS).map(d => `<option value="${d.code}" ${deptFilter === d.code ? 'selected' : ''}>${d.name}</option>`).join('')
        : `<option value="${prof.deptCode}" selected>${window.KTYH_DEPARTMENTS[prof.deptCode]?.name || prof.deptCode}</option>`;

    box.innerHTML = `
    ${!prof.perms.isPersonalOnly ? `
    <div class="ktyh-card mb-2 py-2">
        <div class="row g-2 align-items-center">
            <div class="col-12 col-md-4"><select class="form-select ktyh-input-sm text-info" ${!prof.perms.canViewAllDepts ? 'disabled' : ''} onchange="window._ktyhState.selectedDept=this.value; window.render_ktyh_active_view();">${deptOpts}</select></div>
            <div class="col-6 col-md-3">
                <select class="form-select ktyh-input-sm text-warning" onchange="window._ktyhState.degreeFilter=this.value; window.render_ktyh_active_view();">
                    <option value="ALL" ${degFilter === 'ALL' ? 'selected' : ''}>🎓 Mọi trình độ (${filtered.length})</option>
                    <option value="TS"  ${degFilter === 'TS' ? 'selected' : ''}>Tiến sĩ</option>
                    <option value="THS" ${degFilter === 'THS' ? 'selected' : ''}>Thạc sĩ</option>
                    <option value="CKI" ${degFilter === 'CKI' ? 'selected' : ''}>Chuyên khoa I</option>
                    <option value="DH"  ${degFilter === 'DH' ? 'selected' : ''}>Đại học / Cử nhân</option>
                </select>
            </div>
            <div class="col-6 col-md-5"><input type="text" class="form-control ktyh-input-sm" placeholder="Tìm Họ tên, SĐT, Chuyên ngành..." value="${q}" oninput="window._ktyhState.searchQuery=this.value; window.render_ktyh_active_view();"></div>
        </div>
    </div>` : ''}

    <div class="row g-2">
        ${filtered.map(st => {
            let canSeePrivate = prof.perms.canViewSensitive || (st.staff_code === prof.staff_code);
            let salAlert = canSeePrivate ? window.check_salary_upgrade_status(st.salary_start_date) : null;
            let deptMeta = window.KTYH_DEPARTMENTS[st.dept_code] || { short: st.dept_code, color: '#94a3b8' };
            let rMeta = window.KTYH_ROLE_META[st.ktyh_role] || window.KTYH_ROLE_META.teacher;

            return `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="ktyh-card h-100 d-flex flex-column justify-content-between" style="border-left: 4px solid ${deptMeta.color};">
                    <div>
                        <div class="d-flex justify-content-between align-items-start gap-1 mb-1">
                            <div>
                                <span class="badge ${rMeta.badgeCls} me-1" style="font-size:0.6rem;">${rMeta.short}</span>
                                <span class="fw-bold text-white" style="font-size:0.9rem;">${st.full_name}</span>
                                ${st.is_timekeeper ? `<span class="badge bg-info text-dark ms-1" style="font-size:0.58rem;">Chấm công</span>` : ''}
                            </div>
                            <span class="badge bg-dark border border-secondary text-info" style="font-size:0.65rem;">${st.highest_degree || '--'}</span>
                        </div>
                        <div class="text-warning small fw-bold mb-1" style="font-size:0.75rem;">${st.job_position || st.rank_ngach || 'Viên chức'} • <span class="text-white-50">${deptMeta.short}</span></div>
                        <div class="text-white-50" style="font-size:0.74rem;">
                            <div><i class="bi bi-mortarboard me-1 text-info"></i>CN: ${st.major_specialty || '--'} • <i class="bi bi-telephone me-1 text-success"></i>${st.phone_number || '--'}</div>
                            ${canSeePrivate ? `<div><i class="bi bi-cash-coin me-1 text-warning"></i>HSL: <b class="text-light">${st.salary_coefficient || '--'}</b> (Bậc ${st.salary_step || '-'}) • Từ: ${st.salary_start_date || '--'}</div>` : ''}
                        </div>
                        ${salAlert ? `<div class="mt-1"><span class="badge ${salAlert.cls}" style="font-size:0.65rem;">${salAlert.label}</span></div>` : ''}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary border-opacity-25">
                        <code class="text-white-50" style="font-size:0.7rem;">ID: ${st.staff_code}</code>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-info py-0 px-2 fw-bold" style="font-size:0.7rem;" onclick="window.open_ktyh_staff_detail_modal('${st.staff_code}')"><i class="bi bi-eye-fill me-1"></i>Chi tiết</button>
                            ${prof.perms.canViewTimesheetAll ? `<button class="btn btn-sm btn-outline-success py-0 px-2 fw-bold" style="font-size:0.7rem;" onclick="window._ktyhState.selectedPersonCode='${st.staff_code}'; window.switch_ktyh_tab('timesheet');">Công</button>` : ''}
                            ${prof.perms.canDeleteStaff ? `<button class="btn btn-sm btn-outline-danger py-0 px-1" style="font-size:0.7rem;" onclick="window.remove_ktyh_staff_member('${st.staff_code}')"><i class="bi bi-trash3"></i></button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('') || '<div class="col-12 text-center text-white-50 py-5">Chưa có hồ sơ nhân sự.</div>'}
    </div>`;
};

window.open_ktyh_staff_detail_modal = function(staffCode) {
    let st = (window._ktyhState.profilesList || []).find(x => x.staff_code === staffCode);
    if (!st) return;
    let prof = window.get_current_ktyh_profile();
    let canEdit = prof.perms.canEditStaffRole;
    let canSeePrivate = prof.perms.canViewSensitive || (st.staff_code === prof.staff_code);

    let subId = 'ktyh_staff_detail_modal';
    document.getElementById(subId)?.remove();

    let deptOpts = Object.values(window.KTYH_DEPARTMENTS).map(d => `<option value="${d.code}" ${st.dept_code === d.code ? 'selected' : ''}>${d.name}</option>`).join('');

    let html = `
    <style>
        #${subId}, #${subId} * { scrollbar-width: none !important; -ms-overflow-style: none !important; -webkit-overflow-scrolling: touch !important; }
        #${subId}::-webkit-scrollbar, #${subId} *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    </style>
    <div id="${subId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-2 p-md-3" style="background: rgba(0,0,0,0.86); z-index: 9999999; height: 100dvh; overflow: hidden;">
        <div class="ktyh-card w-100 d-flex flex-column" style="max-width: 820px; max-height: 92dvh; background: #1a1d20; border: 1px solid #38bdf8;">
            <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary flex-shrink-0">
                <h6 class="fw-bold text-info mb-0 text-uppercase"><i class="bi bi-person-vcard-fill me-1"></i> HỒ SƠ: ${st.full_name} (${st.staff_code})</h6>
                <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('${subId}').remove()"></button>
            </div>

            <div class="flex-grow-1 overflow-auto pe-1" style="min-height: 0; overscroll-behavior: contain; touch-action: pan-y; font-size: 0.82rem;">
                ${canEdit ? `
                <div class="p-3 rounded-3 mb-3" style="background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.35);">
                    <div class="fw-bold text-info small text-uppercase mb-2">Phân cấp Khoa KTYH &amp; Quyền Chấm công</div>
                    <div class="row g-2 align-items-end">
                        <div class="col-12 col-md-4"><label class="text-white-50" style="font-size:0.7rem;">Bộ môn / Đơn vị</label><select id="det_dept_code" class="form-select ktyh-input-sm">${deptOpts}</select></div>
                        <div class="col-6 col-md-3">
                            <label class="text-white-50" style="font-size:0.7rem;">Cấp bậc trong Khoa</label>
                            <select id="det_ktyh_role" class="form-select ktyh-input-sm">
                                <option value="teacher"         ${st.ktyh_role === 'teacher' ? 'selected' : ''}>Giảng viên</option>
                                <option value="ktyh_specialist" ${st.ktyh_role === 'ktyh_specialist' ? 'selected' : ''}>Chuyên viên Khoa</option>
                                <option value="ktyh_academic"   ${st.ktyh_role === 'ktyh_academic' ? 'selected' : ''}>Giáo vụ Khoa</option>
                                <option value="ktyh_head"       ${st.ktyh_role === 'ktyh_head' ? 'selected' : ''}>Lãnh đạo Bộ môn</option>
                                <option value="ktyh_dean"       ${st.ktyh_role === 'ktyh_dean' ? 'selected' : ''}>Lãnh đạo Khoa</option>
                            </select>
                        </div>
                        <div class="col-6 col-md-2">
                            <label class="text-white-50" style="font-size:0.7rem;">Loại HĐ</label>
                            <select id="det_contract_type" class="form-select ktyh-input-sm">
                                <option value="VC"   ${st.contract_type === 'VC' ? 'selected' : ''}>VC</option>
                                <option value="HDLD" ${st.contract_type === 'HDLD' ? 'selected' : ''}>HĐLĐ</option>
                            </select>
                        </div>
                        <div class="col-6 col-md-3">
                            <label class="text-white-50" style="font-size:0.7rem;">Chấm công mặc định</label>
                            <select id="det_default_sym" class="form-select ktyh-input-sm">
                                <option value="+"  ${st.default_attendance_sym !== 'HT' ? 'selected' : ''}>+ (Đi làm)</option>
                                <option value="HT" ${st.default_attendance_sym === 'HT' ? 'selected' : ''}>HT (Đi học)</option>
                            </select>
                        </div>
                        <div class="col-12 mt-2">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="det_is_timekeeper" ${st.is_timekeeper ? 'checked' : ''}>
                                <label class="form-check-label text-warning fw-bold small" for="det_is_timekeeper">Kiêm nhiệm Người chấm công cho Bộ môn / Đơn vị này (Tự điền tên chữ ký "Người chấm công" trên C01-HD)</label>
                            </div>
                        </div>
                    </div>
                </div>` : ''}

                <div class="row g-2">
                    <div class="col-12 col-md-6">
                        <div class="p-2 px-3 rounded-3 h-100" style="background:#121417; border:1px solid #2b3035;">
                            <div class="fw-bold text-warning small mb-1">1. Thông tin Cá nhân</div>
                            <div>Giới tính: <b>${st.gender || '--'}</b> • Ngày sinh: <b>${st.dob || '--'}</b></div>
                            <div>SĐT: <b class="text-success">${st.phone_number || '--'}</b></div>
                            ${canSeePrivate ? `
                            <div>Số CCCD: <b class="text-info">${st.cccd_number || '--'}</b> (${st.cccd_issue_date || '--'})</div>
                            <div>Nơi cấp: <span class="text-white-50">${st.cccd_issue_place || '--'}</span></div>
                            <div>Thường trú: <span class="text-white-50">${st.permanent_address || '--'}</span></div>` : `<div class="text-white-50 fst-italic mt-1">🔒 Thông tin CCCD &amp; địa chỉ được ẩn theo phân cấp.</div>`}
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="p-2 px-3 rounded-3 h-100" style="background:#121417; border:1px solid #2b3035;">
                            <div class="fw-bold text-info small mb-1">2. Công tác &amp; Đơn vị</div>
                            <div>Ngạch: <b>${st.rank_ngach || '--'}</b> • Số QĐ: <b>${st.recruitment_decision || '--'}</b></div>
                            <div>Chức vụ: <b class="text-warning">${st.job_position || '--'}</b></div>
                            <div>Đơn vị: <span class="text-white-50">${st.unit_full_name || '--'}</span></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="p-2 px-3 rounded-3 h-100" style="background:#121417; border:1px solid #2b3035;">
                            <div class="fw-bold text-success small mb-1">3. Trình độ Chuyên môn</div>
                            <div>Trình độ: <b class="text-success">${st.highest_degree || '--'}</b> • CN: <b>${st.major_specialty || '--'}</b> (${st.graduation_year || '--'})</div>
                            <div>Ngoại ngữ: <b>${st.foreign_language || '--'}</b> • Tin học: <b>${st.it_level || '--'}</b></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="p-2 px-3 rounded-3 h-100" style="background:#121417; border:1px solid #2b3035;">
                            <div class="fw-bold text-danger small mb-1">4. Lương &amp; Ngân hàng</div>
                            ${canSeePrivate ? `
                            <div>HSL: <b class="text-warning fs-6">${st.salary_coefficient || '--'}</b> • Bậc: <b>${st.salary_step || '--'}</b> (Từ: ${st.salary_start_date || '--'})</div>
                            <div>STK: <b class="text-info font-monospace">${st.bank_account || '--'}</b> (${st.bank_name || '--'})</div>` : `<div class="text-white-50 fst-italic">🔒 Chỉ Admin, Lãnh đạo Khoa &amp; chủ tài khoản mới xem được mục này.</div>`}
                        </div>
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-2 mt-2 border-top border-secondary flex-shrink-0">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" onclick="document.getElementById('${subId}').remove()">Đóng</button>
                ${canEdit ? `<button type="button" class="btn btn-sm btn-info fw-bold text-dark px-4" onclick="window.save_ktyh_staff_quick_edit('${st.staff_code}')"><i class="bi bi-floppy-fill me-1"></i>Lưu phân cấp</button>` : ''}
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.save_ktyh_staff_quick_edit = async function(staffCode) {
    let dept = document.getElementById('det_dept_code')?.value || 'BM_KTXN';
    let role = document.getElementById('det_ktyh_role')?.value || 'teacher';
    let cType = document.getElementById('det_contract_type')?.value || 'VC';
    let defSym = document.getElementById('det_default_sym')?.value || '+';
    let isTk = Boolean(document.getElementById('det_is_timekeeper')?.checked);

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error: e1 } = await clientDb.from('staff_profiles').update({
            dept_code: dept, ktyh_role: role, contract_type: cType, default_attendance_sym: defSym, is_timekeeper: isTk
        }).eq('staff_code', staffCode);
        if (e1) throw e1;

        const { data: uRow } = await clientDb.from('users').select('role').eq('student_id', staffCode).maybeSingle();
        let updateU = { nganh_hoc: window.KTYH_DEPARTMENTS[dept]?.short || dept };
        if (uRow && uRow.role !== 'all' && uRow.role !== 'admin') updateU.role = role;
        await clientDb.from('users').update(updateU).eq('student_id', staffCode);

        document.getElementById('ktyh_staff_detail_modal')?.remove();
        await window.load_ktyh_db_data();
        window.render_ktyh_active_view();
        window.show_toast("✅ Đã lưu phân cấp & đồng bộ 2 chiều!");
    } catch (err) {
        window.show_toast("❌ Lỗi cập nhật: " + err.message, true);
    }
};

window.remove_ktyh_staff_member = async function(staffCode) {
    if (!confirm(`⚠️ [ADMIN] Xóa đồng bộ tài khoản [${staffCode}] khỏi toàn hệ thống?`)) return;
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('users').delete().eq('student_id', staffCode);
        if (error) throw error;
        await window.load_ktyh_db_data();
        window.render_ktyh_active_view();
        window.show_toast(`🗑️ Đã xóa đồng bộ tài khoản [${staffCode}]!`);
    } catch (e) { window.show_toast("❌ Lỗi xóa: " + e.message, true); }
};

// =========================================================================
// 🖨️ 9. XUẤT EXCEL C01-HD & IN A4 (TỰ LẤY TÊN NGƯỜI CHẤM CÔNG & TRƯỞNG ĐƠN VỊ)
// =========================================================================
window.get_dept_signers_dynamic = function(list) {
    let headObj = list.find(x => x.ktyh_role === 'ktyh_head') || list.find(x => x.ktyh_role === 'ktyh_dean');
    let tkObj = list.find(x => x.is_timekeeper);
    return {
        headName: headObj ? headObj.full_name : '........................................',
        timekeeperName: tkObj ? tkObj.full_name : '........................................'
    };
};

window.export_c01_individual_or_full_print = function(mode = 'FULL', specificStaffCode = null) {
    let list = window._ktyhState.profilesList || [];
    if (list.length === 0) return window.show_toast("⚠️ Chưa có danh sách nhân sự!", true);

    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthMap = window._ktyhState.timesheetMap[`${y}_${String(m).padStart(2, '0')}`] || {};
    let numDays = window.get_days_in_month(m, y);

    let prof = window.get_current_ktyh_profile();
    let deptFilter = prof.perms.canViewAllDepts ? (window._ktyhState.selectedDept || 'ALL') : prof.deptCode;
    let scoped = deptFilter === 'ALL' ? list : list.filter(x => x.dept_code === deptFilter);
    let deptTitle = deptFilter === 'ALL' ? 'Khoa Kỹ thuật Y học' : (window.KTYH_DEPARTMENTS[deptFilter]?.name || deptFilter);
    let signers = window.get_dept_signers_dynamic(scoped);

    let targetCode = specificStaffCode || (prof.perms.isPersonalOnly ? prof.staff_code : (window._ktyhState.selectedPersonCode !== 'ALL' ? window._ktyhState.selectedPersonCode : null));
    if (mode === 'SINGLE' && !targetCode) {
        let qName = prompt("Nhập Mã CB hoặc Tên cán bộ muốn xuất phiếu riêng:");
        if (!qName) return;
        let found = scoped.find(x => x.staff_code.toLowerCase() === qName.trim().toLowerCase() || window.clean_vn_str(x.full_name).includes(window.clean_vn_str(qName)));
        if (!found) return window.show_toast("⚠️ Không tìm thấy cán bộ này!", true);
        targetCode = found.staff_code;
    }

    const buildPage = (titleText, arr) => {
        let dayCols = '', idxCols = '';
        for (let d = 1; d <= 31; d++) { dayCols += `<th style="width:19px;">${d}</th>`; idxCols += `<th>${d}</th>`; }
        let rowsHtml = arr.map((st, idx) => {
            let daysObj = monthMap[st.staff_code]?.days_json || {};
            let sum = window.calculate_c01_summary_counts(daysObj, numDays);
            let cells = '';
            for (let d = 1; d <= 31; d++) cells += `<td>${d <= numDays ? (daysObj[d] || '') : ''}</td>`;
            return `<tr><td>${idx + 1}</td><td style="text-align:left; padding-left:5px; white-space:nowrap;">${st.full_name}</td>${cells}<td style="font-weight:bold;">${sum.paidDays}</td><td>${sum.unpaidDays || ''}</td><td>${sum.bhxhDays || ''}</td></tr>`;
        }).join('');

        return `
        <div class="c01-print-page">
            <table style="width:100%; border:none; margin-bottom:6px;">
                <tr>
                    <td style="width:55%; text-align:left; border:none; vertical-align:top;"><div style="font-weight:bold; font-size:11pt;">KHOA KỸ THUẬT Y HỌC</div><div style="font-weight:bold; font-size:11pt;">Đơn vị: ${deptTitle}</div></td>
                    <td style="width:45%; text-align:center; border:none; font-size:9.5pt; font-style:italic;"><b>Mẫu số C01 – HD</b> Ban hành kèm theo<br>Thông tư số 107/2017/TT-BTC ngày 10/10/2017</td>
                </tr>
            </table>
            <div style="text-align:center; font-weight:bold; font-size:13pt;">${titleText}</div>
            <div style="text-align:center; font-weight:bold; font-style:italic; font-size:11pt; margin-bottom:8px;">Tháng ${String(m).padStart(2, '0')} năm ${y}</div>
            <table class="c01-print-grid">
                <thead>
                    <tr><th rowspan="2" style="width:26px;">TT</th><th rowspan="2" style="min-width:145px;">Họ và tên</th><th colspan="31">Ngày trong tháng</th><th colspan="3">Quy ra công</th></tr>
                    <tr>${dayCols}<th style="width:48px; font-size:8.5pt;">Công lương TG</th><th style="width:45px; font-size:8.5pt;">Không lương</th><th style="width:45px; font-size:8.5pt;">Hưởng BHXH</th></tr>
                    <tr><th>A</th><th>B</th>${idxCols}<th>32</th><th>33</th><th>34</th></tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <table style="width:100%; border:none; margin-top:14px; font-size:11pt;">
                <tr>
                    <td style="width:35%; text-align:center; border:none;"><b>Người chấm công</b><br><br><br><br><b>${signers.timekeeperName}</b></td>
                    <td style="width:30%; text-align:center; border:none;">${mode === 'SINGLE' && arr.length === 1 ? `<b>Cán bộ tự chấm công</b><br><br><br><br><b>${arr[0].full_name}</b>` : ''}</td>
                    <td style="width:35%; text-align:center; border:none;"><i>Huế, ngày ...... tháng ${String(m).padStart(2, '0')} năm ${y}</i><br><b>Trưởng đơn vị</b><br><br><br><br><b>${signers.headName}</b></td>
                </tr>
            </table>
        </div>`;
    };

    let pagesContent = '';
    if (mode === 'SINGLE' && targetCode) {
        let st = list.find(x => x.staff_code.toLowerCase() === String(targetCode).toLowerCase());
        if (!st) return;
        pagesContent = buildPage(`PHIẾU CHẤM CÔNG CÁ NHÂN — ${st.full_name.toUpperCase()}`, [st]);
    } else {
        let vcList = scoped.filter(x => x.contract_type === 'VC'), hdList = scoped.filter(x => x.contract_type === 'HDLD');
        if (vcList.length > 0) pagesContent += buildPage('BẢNG CHẤM CÔNG LÀM VIỆC VIÊN CHỨC (VC.)', vcList);
        if (hdList.length > 0) pagesContent += (vcList.length > 0 ? `<div style="page-break-before: always;"></div>` : '') + buildPage('BẢNG CHẤM CÔNG LÀM VIỆC HỢP ĐỒNG LAO ĐỘNG (HĐLĐ)', hdList);
    }

    let win = window.open('', '_blank');
    if (!win) return window.show_toast("⚠️ Vui lòng cho phép mở Pop-up để in!", true);
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>C01-HD Tháng ${m}/${y}</title>
        <style>@page{size:A4 landscape;margin:10mm;}body{font-family:"Times New Roman",serif;color:#000;background:#fff;margin:0;}.c01-print-grid{width:100%;border-collapse:collapse;font-size:10pt;}.c01-print-grid th,.c01-print-grid td{border:1px solid #000;padding:3px 2px;text-align:center;}</style>
    </head><body>${pagesContent}<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>`);
    win.document.close();
};

window.export_c01_excel_file = function() {
    if (typeof XLSX === 'undefined') return window.show_toast("⚠️ Thiếu SheetJS!", true);
    let list = window._ktyhState.profilesList || [];
    if (list.length === 0) return window.show_toast("⚠️ Chưa có danh sách nhân sự!", true);

    let m = window._ktyhState.selectedMonth, y = window._ktyhState.selectedYear;
    let monthMap = window._ktyhState.timesheetMap[`${y}_${String(m).padStart(2, '0')}`] || {};
    let numDays = window.get_days_in_month(m, y);

    let prof = window.get_current_ktyh_profile();
    let deptFilter = prof.perms.canViewAllDepts ? (window._ktyhState.selectedDept || 'ALL') : prof.deptCode;
    let scoped = deptFilter === 'ALL' ? list : list.filter(x => x.dept_code === deptFilter);
    let deptTitle = deptFilter === 'ALL' ? 'Khoa Kỹ thuật Y học' : (window.KTYH_DEPARTMENTS[deptFilter]?.name || deptFilter);
    let signers = window.get_dept_signers_dynamic(scoped);

    const buildSheet = (arr, title) => {
        let aoa = [
            ["KHOA KỸ THUẬT Y HỌC", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Mẫu số C01 – HD (TT 107/2017/TT-BTC)"],
            [`Đơn vị: ${deptTitle}`], [], [title],
            ["", "", "", "", "", "", "", "", "", "", "", `Tháng ${String(m).padStart(2, '0')} năm ${y}`]
        ];
        let hdr = ["TT", "Họ và tên"];
        for (let d = 1; d <= 31; d++) hdr.push(d);
        hdr.push("Số công hưởng lương thời gian", "Số công nghỉ không lương", "Số công hưởng BHXH");
        aoa.push(hdr);

        arr.forEach((st, idx) => {
            let daysObj = monthMap[st.staff_code]?.days_json || {};
            let sum = window.calculate_c01_summary_counts(daysObj, numDays);
            let r = [idx + 1, st.full_name];
            for (let d = 1; d <= 31; d++) r.push(d <= numDays ? (daysObj[d] || "") : "");
            r.push(sum.paidDays, sum.unpaidDays || "", sum.bhxhDays || "");
            aoa.push(r);
        });
        aoa.push([], ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Huế, ngày ... tháng ${String(m).padStart(2, '0')} năm ${y}`]);
        aoa.push(["", "Người chấm công", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Trưởng đơn vị"]);
        aoa.push([], [], ["", signers.timekeeperName, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", signers.headName]);
        return XLSX.utils.aoa_to_sheet(aoa);
    };

    let wb = XLSX.utils.book_new();
    let vcList = scoped.filter(x => x.contract_type === 'VC'), hdList = scoped.filter(x => x.contract_type === 'HDLD');
    if (vcList.length > 0) XLSX.utils.book_append_sheet(wb, buildSheet(vcList, "BẢNG CHẤM CÔNG LÀM VIỆC VIÊN CHỨC"), "VC.");
    if (hdList.length > 0) XLSX.utils.book_append_sheet(wb, buildSheet(hdList, "BẢNG CHẤM CÔNG LÀM VIỆC HỢP ĐỒNG LAO ĐỘNG"), "HĐLĐ");
    XLSX.writeFile(wb, `Cham_Cong_KTYH_${deptFilter}_T${String(m).padStart(2, '0')}_${y}.xlsx`);
    window.show_toast(`✅ Đã xuất file Excel Mẫu C01-HD Tháng ${m}/${y}!`);
};

// =========================================================================
// 📚 10. TAB HỌC PHẦN & ĐỀ THI
// =========================================================================
window.render_ktyh_subjects_exams_tab = function(box) {
    let allSubjects = Object.keys(window.subjectConfig || {}).map(k => ({ key: k, name: window.subjectConfig[k].name || k }));
    box.innerHTML = `
    <div class="ktyh-card">
        <div class="fw-bold text-info text-uppercase mb-2 pb-1 border-bottom border-secondary">
            <i class="bi bi-journal-bookmark-fill me-1"></i> Học phần Chuyên môn thuộc Khoa KTYH (${allSubjects.length})
        </div>
        <div class="row g-2">
            ${allSubjects.map(s => `
            <div class="col-12 col-md-6">
                <div class="p-2 px-3 rounded-3 d-flex justify-content-between align-items-center" style="background:#121417; border:1px solid #262b31;">
                    <div class="text-truncate pe-2">
                        <div class="fw-bold text-white" style="font-size:0.85rem;">${s.name}</div>
                        <div class="text-white-50 small">Mã học phần: <code class="text-info">${s.key}</code></div>
                    </div>
                    <div class="d-flex gap-1 flex-shrink-0">
                        <button class="btn btn-sm btn-outline-warning py-1 px-2 fw-bold" style="font-size:0.72rem;" onclick="document.getElementById('ktyh_faculty_portal_modal').remove(); window.admin_login_process('${s.key}')">Ma trận Bloom</button>
                        <button class="btn btn-sm btn-outline-info py-1 px-2 fw-bold" style="font-size:0.72rem;" onclick="document.getElementById('ktyh_faculty_portal_modal').remove(); window.show_edit_lesson_list('${s.key}')">Câu hỏi</button>
                    </div>
                </div>
            </div>`).join('')}
        </div>
    </div>`;
};

// =========================================================================
// 🚀 TỰ ĐỘNG ĐIỀU HƯỚNG NGAY KHI ĐĂNG NHẬP (HỖ TRỢ SPA KHÔNG TẢI LẠI TRANG)
// =========================================================================
(function initKtyhAutoLoginRouter() {
    if (window._ktyhLoginWatcherStarted) return;
    window._ktyhLoginWatcherStarted = true;

    let lastRoutedSignature = '';
    const KTYH_AUTO_OPEN_ROLES = ['ktyh_dean', 'ktyh_head', 'ktyh_academic', 'ktyh_specialist'];
    const KTYH_ALL_STAFF_ROLES = ['admin', 'all', 'ktyh_dean', 'ktyh_head', 'ktyh_academic', 'ktyh_specialist', 'teacher', 'timekeeper'];

    const ensureFloatingLauncher = (show, roleKey) => {
        let btn = document.getElementById('ktyh_floating_launcher_btn');
        if (!show) {
            if (btn) btn.remove();
            return;
        }
        if (!btn) {
            let meta = window.KTYH_ROLE_META[roleKey] || { short: 'Khoa KTYH', color: '#10b981' };
            document.body.insertAdjacentHTML('beforeend', `
                <button id="ktyh_floating_launcher_btn" type="button"
                    onclick="window.open_ktyh_faculty_portal()"
                    style="position: fixed; right: 14px; bottom: 18px; z-index: 99990; background: linear-gradient(135deg, #065f46, #10b981); color: #fff; border: 1px solid #6ee7b7; border-radius: 999px; padding: 8px 14px; font-size: 0.8rem; font-weight: 700; box-shadow: 0 6px 20px rgba(0,0,0,0.45); display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-hospital-fill"></i>
                    <span>Cổng Khoa KTYH (${meta.short})</span>
                </button>
            `);
        }
    };

    setInterval(() => {
        let uid = String(window.current_student_id || '').trim();
        let role = String(window.current_user_role || '').trim().toLowerCase();

        // Chưa đăng nhập hoặc đã đăng xuất
        if (!uid || !role) {
            lastRoutedSignature = '';
            ensureFloatingLauncher(false);
            return;
        }

        let isStaff = KTYH_ALL_STAFF_ROLES.includes(role) || role.includes('gv');
        if (!isStaff) {
            ensureFloatingLauncher(false);
            return;
        }

        // Luôn hiện nút mở nhanh Cổng Khoa KTYH cho toàn bộ cán bộ/giảng viên (trừ Admin đã có thẻ trên Hub)
        ensureFloatingLauncher(role !== 'admin' && role !== 'all', role);

        // Nếu là Lãnh đạo Khoa / Bộ môn / Giáo vụ / Chuyên viên vừa đăng nhập -> Tự mở thẳng Cổng Khoa KTYH
        let sig = `${uid}__${role}`;
        if (KTYH_AUTO_OPEN_ROLES.includes(role) && lastRoutedSignature !== sig) {
            lastRoutedSignature = sig;
            setTimeout(() => {
                if (!document.getElementById('ktyh_faculty_portal_modal') && typeof window.open_ktyh_faculty_portal === 'function') {
                    window.open_ktyh_faculty_portal();
                }
            }, 350);
        }
    }, 500);
})();