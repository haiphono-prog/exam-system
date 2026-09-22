/* =========================================================================
   🌐 TÁI CẤU TRÚC V21: SINGLE SOURCE OF TRUTH (100% TỪ HỒ SƠ XÉT TUYỂN)
   ========================================================================= */

window.stat_adm_charts = window.stat_adm_charts || {};
window.adm_active_major = "ALL";
window.adm_tuyen_sinh_dot = "DOT1"; // Mặc định mở lên là Đợt 1
window.adm_raw_full_rows = [];
window.adm_update_date_str = new Date().toLocaleDateString('vi-VN');

// KHO LƯU TRỮ DUY NHẤT GOM CẢ HỒ SƠ & TRÚNG TUYỂN (TT = Xác nhận Email, NH = Nhập học)
window.adm_master_store = [
    { name: "Điều dưỡng", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 300 },
    { name: "Hộ sinh", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 50 },
    { name: "Dược", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 200 },
    { name: "KT Xét nghiệm y học", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 50 },
    { name: "Y học cổ truyền", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 50 },
    { name: "Chăm sóc sắc đẹp", nv1: 0, nv2: 0, nv3: 0, tt: 0, nh: 0, ct: 50 }
];

/**
 * 🌟 1. KHỞI TẠO KHUNG GIAO DIỆN HỢP NHẤT
 */
window.render_admission_analytics = function() {
    const container = document.getElementById('dash_subject_cards_container');
    if (!container) return;

    let safe_role = String(window.current_user_role || '').trim().toLowerCase();
    let isAdmin = (safe_role === 'all' || safe_role === 'admin' || safe_role === 'useradmin');
    let exitAction = isAdmin ? "window.render_admin_hub()" : "window.render_student_subject_list()";

    container.innerHTML = `
        <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1200px !important;">
            
            <!-- HEADER TOOLBAR -->
            <div class="col-12 px-1 mb-1">
                <div class="d-flex flex-wrap justify-content-between align-items-center bg-dark p-2 px-3 rounded-4 shadow-sm gap-2" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                    <div>
                        <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="${exitAction}">
                            <i class="bi bi-arrow-left me-1"></i> Thoát
                        </button>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <h5 class="text-white fw-bold mb-0 m-0"><i class="bi bi-database-fill text-warning me-2"></i> TRUNG TÂM DỮ LIỆU TUYỂN SINH HỢP NHẤT</h5>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${isAdmin ? `
                            <button class="adm-icon-btn shadow-sm" onclick="document.getElementById('excel_local_file').click()" title="Nạp File Hồ Sơ Xét Tuyển (40+ cột)">
                                <i class="bi bi-file-earmark-excel-fill text-success fs-5"></i>
                            </button>
                            <input type="file" id="excel_local_file" accept=".xlsx, .xls" style="display: none;" onchange="window.handleLocalExcelUpload(event)">
                        ` : ''}
                        <button class="adm-icon-btn shadow-sm" onclick="window.loadDataFromGoogleDrive()" title="Đồng bộ lại từ Drive">
                            <i class="bi bi-arrow-clockwise text-info fs-5"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- BỘ LỌC TÌM KIẾM -->
            <div class="col-12 mt-1 mb-1">
                <div class="glass-panel p-2 rounded-4 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div class="d-flex flex-wrap align-items-center gap-1">
                        <span class="text-white-50 small fw-bold me-1" style="font-size: 0.7rem;"><i class="bi bi-filter me-1"></i> NGÀNH:</span>
                        <button class="nav-filter-btn active" onclick="window.switchMajorFilter('ALL', this)">Tất cả</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('Điều dưỡng', this)">Điều dưỡng</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('Hộ sinh', this)">Hộ sinh</button>
                        <button class="nav-filter-btn" style="border-color: #facc15 !important; color: #fde047 !important;" onclick="window.switchMajorFilter('GOP_DD_HS', this)">ĐD & HS (Gộp)</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('Dược', this)">Dược</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('KT Xét nghiệm y học', this)">KT.XN</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('Y học cổ truyền', this)">YHCT</button>
                        <button class="nav-filter-btn" onclick="window.switchMajorFilter('Chăm sóc sắc đẹp', this)">Sắc đẹp</button>
                    </div>

                    <div class="d-flex align-items-center gap-1">
                        <span class="text-white-50 small fw-bold" style="font-size: 0.7rem;">ĐỢT TS:</span>
                        <select id="select_tuyen_sinh_dot" class="form-select form-select-sm fw-bold border-secondary" style="width: 140px; font-size: 0.75rem; background-color: #0f172a !important; color: #facc15 !important;" onchange="window.changeTuyenSinhDot(this.value)">
                            <option value="ALL_DOTS">Tất cả các đợt</option>
                            <option value="DOT1" selected>Đợt 1 (Chính thức)</option>
                            <option value="DOT2">Đợt 2 (Bổ sung)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- VÙNG HIỂN THỊ DỮ LIỆU ĐỘNG -->
            <div id="main_analytics_view_area" class="w-100 row g-3 m-0 p-0"></div>
        </div>`;

    window.loadDataFromGoogleDrive();
};

/**
 * 🌟 2. ĐỌC DỮ LIỆU TỪ GOOGLE DRIVE HOẶC FILE LOCAL
 */
window.loadDataFromGoogleDrive = function() {
    if (typeof google === 'undefined' || !google.script) return;
    if (typeof window.show_toast === 'function') window.show_toast("☁️ Đang đồng bộ dữ liệu Hồ sơ gốc từ Drive...");

    google.script.run.withSuccessHandler(function(res) {
        if (res && res.success && res.rows && res.rows.length > 1) {
            window.adm_raw_full_rows = res.rows;
            let sheetName = res.sheetName || "";
            let matchDate = sheetName.match(/(\d{1,2}[-_\/]\d{1,2}[-_\/]\d{4})/);
            if (matchDate) window.adm_update_date_str = matchDate[1].replace(/[-_]/g, '/');

            window.processUnifiedData();
            if (typeof window.show_toast === 'function') window.show_toast(`✅ Đã nạp thành công ${res.rows.length - 1} hồ sơ!`);
        } else {
            if (typeof window.show_toast === 'function') window.show_toast("⚠️ Tab Drive trống hoặc không tìm thấy.");
        }
    }).getAdmissionDriveData();
};

window.handleLocalExcelUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let readFilePromise = function(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                resolve(rawRows);
            };
            reader.readAsArrayBuffer(file);
        });
    };

    let rawRows = await readFilePromise(files[0]);
    if (rawRows.length > 1) {
        window.adm_raw_full_rows = rawRows;
        window.processUnifiedData();

        if (typeof window.show_toast === 'function') window.show_toast(`✅ Đã nạp thành công ${rawRows.length - 1} hồ sơ từ máy tính!`);
        
        // Auto Upload Drive
        let todayStr = new Date().toLocaleDateString('vi-VN').replace(/[\/-]/g, '');
        google.script.run.saveAdmissionDataToDriveSheet(todayStr, rawRows);
    }
};

/**
 * 🌟 3. BÓC TÁCH VÀ TÍNH TOÁN DỮ LIỆU TỪ HỒ SƠ (ĐÃ SỬA CỘT AM LÀM XÁC NHẬN EMAIL)
 */
window.processUnifiedData = function() {
    let rows = window.adm_raw_full_rows;
    if (!rows || rows.length < 2) return;

    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        let rowStr = (rows[i] || []).map(c => String(c||'').toLowerCase()).join(' ');
        if (rowStr.includes('ngành nv1') || rowStr.includes('thí sinh') || rowStr.includes('năm ts')) {
            headerIdx = i; break;
        }
    }

    const headers = (rows[headerIdx] || []).map(h => String(h || '').trim().toLowerCase());
    
    let dotCol      = headers.findIndex(h => h.includes('năm ts') || h.includes('đợt'));
    let nv1Col      = headers.findIndex(h => h === 'ngành nv1' || h.includes('nv1'));
    let nv2Col      = headers.findIndex(h => h === 'ngành nv2' || h.includes('nv2'));
    let nv3Col      = headers.findIndex(h => h === 'ngành nv3' || h.includes('nv3'));
    let emailCol    = headers.findIndex(h => h.includes('xác nhận email')); 
    let nhapHocCol  = headers.findIndex(h => h === 'nhập học' || h.includes('nhập học'));

    // 🟢 SỬA CHUẨN ĐỊNH VỊ CỘT THEO FILE CỦA THẦY
    if (dotCol === -1) dotCol = 36;       // Cột AK (Chỉ số 36)
    if (nv1Col === -1) nv1Col = 12;       // Cột M  (Chỉ số 12)
    if (emailCol === -1) emailCol = 38;   // Cột AM (Chỉ số 38) -> ĐÃ SỬA CHÍNH XÁC!
    if (nhapHocCol === -1) nhapHocCol = 39; // Cột AN (Chỉ số 39)

    window.adm_master_store.forEach(item => {
        item.nv1 = 0; item.nv2 = 0; item.nv3 = 0; item.tt = 0; item.nh = 0;
    });

    let curFilter = window.adm_tuyen_sinh_dot;

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length <= 1) continue;
        if (!r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) continue;

        // Thuật toán lọc đợt tuyển sinh
        let valDot = dotCol !== -1 && dotCol < r.length ? String(r[dotCol] || '').trim().toLowerCase() : '';
        if (valDot !== '' && valDot.includes('202') && !valDot.includes('2026')) continue; 
        if (curFilter === 'DOT1' && !(valDot.includes('đợt 1') || valDot.includes('dot1') || valDot.includes('đợt1'))) continue;
        if (curFilter === 'DOT2' && !(valDot.includes('đợt 2') || valDot.includes('dot2') || valDot.includes('đợt2'))) continue;

        let nv1 = nv1Col !== -1 && nv1Col < r.length ? String(r[nv1Col]||'').trim() : '';
        let nv2 = nv2Col !== -1 && nv2Col < r.length ? String(r[nv2Col]||'').trim() : '';
        let nv3 = nv3Col !== -1 && nv3Col < r.length ? String(r[nv3Col]||'').trim() : '';
        if (nv1.toLowerCase().includes('xét nghiệm')) nv1 = 'KT Xét nghiệm y học';
        if (nv2.toLowerCase().includes('xét nghiệm')) nv2 = 'KT Xét nghiệm y học';
        if (nv3.toLowerCase().includes('xét nghiệm')) nv3 = 'KT Xét nghiệm y học';

        // Gọi trúng tuyển kiểm tra cột AM
        let valEmail = emailCol !== -1 && emailCol < r.length ? String(r[emailCol]||'').trim().toLowerCase() : '';
        let isTrungTuyen = valEmail !== '' && valEmail !== '—' && !valEmail.includes('chưa');

        // Thực nhập học kiểm tra cột AN
        let valNH = nhapHocCol !== -1 && nhapHocCol < r.length ? String(r[nhapHocCol]||'').trim().toLowerCase() : '';
        let isNhapHoc = valNH !== '' && valNH !== '—' && valNH !== '0' && !valNH.includes('chưa');

        window.adm_master_store.forEach(item => {
            if (item.name === nv1) {
                item.nv1++;
                if (isTrungTuyen) item.tt++;
                if (isNhapHoc) item.nh++;
            }
            if (item.name === nv2) item.nv2++;
            if (item.name === nv3) item.nv3++;
        });
    }

    window.renderUI();
};

window.switchMajorFilter = function(major, btn) {
    document.querySelectorAll('.nav-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.adm_active_major = major;
    window.renderUI();
};

window.changeTuyenSinhDot = function(dotVal) {
    window.adm_tuyen_sinh_dot = dotVal;
    window.processUnifiedData();
};

/**
 * 🌟 4. RENDER GIAO DIỆN (ĐÃ TỐI GIẢN ICON VÀ TIÊU ĐỀ ĐỘNG)
 */
window.renderUI = function() {
    let viewArea = document.getElementById('main_analytics_view_area');
    if (!viewArea) return;

    let actMajor = window.adm_active_major;
    let store = window.adm_master_store;
    
    let kpiNv1 = 0, kpiNv2 = 0, kpiNv3 = 0, kpiTt = 0, kpiNh = 0, kpiCt = 0;
    let htmlTable = "";

    store.forEach((r, idx) => {
        let isMatch = false;
        if (actMajor === 'ALL') isMatch = true;
        else if (actMajor === 'GOP_DD_HS' && (r.name === 'Điều dưỡng' || r.name === 'Hộ sinh')) isMatch = true;
        else if (r.name === actMajor) isMatch = true;

        if (isMatch) {
            kpiNv1 += r.nv1; kpiNv2 += r.nv2; kpiNv3 += r.nv3;
            kpiTt += r.tt; kpiNh += r.nh; kpiCt += r.ct;
        }

        let trStyle = isMatch && actMajor !== 'ALL' ? 'background: rgba(56, 189, 248, 0.15) !important;' : '';
        htmlTable += `
            <tr style="${trStyle}">
                <td class="text-center font-monospace text-white-50">${idx + 1}</td>
                <td class="fw-bold text-info">${r.name}</td>
                <td class="text-center font-monospace text-primary fw-bold">${r.nv1}</td>
                <td class="text-center font-monospace">${r.nv2}</td>
                <td class="text-center font-monospace">${r.nv3}</td>
                <td class="text-center font-monospace text-warning fw-bold">${r.tt}</td>
                <td class="text-center font-monospace text-success fw-bold">${r.nh}</td>
                <td class="text-center font-monospace text-white-50">${r.ct}</td>
                <td class="text-center font-monospace text-danger fw-bold">${r.ct - r.nh}</td>
            </tr>
        `;
    });

    let dotName = window.adm_tuyen_sinh_dot === 'ALL_DOTS' ? 'TẤT CẢ CÁC ĐỢT' : (window.adm_tuyen_sinh_dot === 'DOT1' ? 'ĐỢT 1' : 'ĐỢT 2');
    let tlCanhTranh = kpiCt > 0 ? ((kpiNv1 / kpiCt) * 100).toFixed(1) : 0;
    let tlGoi = kpiNv1 > 0 ? ((kpiTt / kpiNv1) * 100).toFixed(1) : 0;
    let tlChuyenDoi  = kpiTt > 0 ? ((kpiNh / kpiTt) * 100).toFixed(1) : 0;
    let tlLapDay = kpiCt > 0 ? ((kpiNh / kpiCt) * 100).toFixed(1) : 0;

    viewArea.innerHTML = `
        <div class="col-6 col-md-3">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #facc15 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Tổng Chỉ Tiêu</span><i class="bi bi-flag-fill text-warning fs-5"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${kpiCt.toLocaleString()}</h3>
                <div class="text-warning mt-1" style="font-size: 0.7rem;"><i class="bi bi-bullseye"></i> Kế hoạch 2026</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #38bdf8 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Hồ Sơ Cứng (NV1)</span><i class="bi bi-folder-fill text-info fs-5"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${kpiNv1.toLocaleString()}</h3>
                <div class="text-info mt-1" style="font-size: 0.7rem;"><i class="bi bi-funnel"></i> Đang lọc: ${dotName}</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #c084fc !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Tỷ Lệ Cạnh Tranh</span><i class="bi bi-bar-chart-line-fill fs-5" style="color: #c084fc !important;"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${tlCanhTranh}%</h3>
                <div class="text-white-50 mt-1" style="font-size: 0.7rem;">(Hồ sơ NV1 / Chỉ tiêu)</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #a855f7 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">NV Phụ (NV2, NV3)</span><i class="bi bi-files fs-5" style="color: #a855f7 !important;"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${(kpiNv2 + kpiNv3).toLocaleString()}</h3>
                <div class="text-white-50 mt-1" style="font-size: 0.7rem;">Nguồn thí sinh dự phòng</div>
            </div>
        </div>

        <div class="col-6 col-md-3 mt-2">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #f97316 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Gọi Trúng Tuyển</span><i class="bi bi-megaphone-fill fs-5" style="color: #f97316 !important;"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${kpiTt.toLocaleString()}</h3>
                <div class="mt-1" style="font-size: 0.7rem; color: #f97316 !important;"><i class="bi bi-pie-chart"></i> Gọi TT / Hồ sơ NV1: ${tlGoi}%</div>
            </div>
        </div>
        <div class="col-6 col-md-3 mt-2">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #4ade80 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Thực Tế Nhập Học</span><i class="bi bi-check-circle-fill text-success fs-5"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${kpiNh.toLocaleString()}</h3>
                <div class="text-success mt-1" style="font-size: 0.7rem;"><i class="bi bi-graph-up-arrow"></i> Chuyển đổi NH/Gọi: ${tlChuyenDoi}%</div>
            </div>
        </div>
        <div class="col-6 col-md-3 mt-2">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #06b6d4 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Tỷ Lệ Lấp Đầy</span><i class="bi bi-speedometer fs-5" style="color: #06b6d4 !important;"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${tlLapDay}%</h3>
                <div class="mt-1" style="font-size: 0.7rem; color: #06b6d4 !important;">(Thực Nhập học / Chỉ tiêu)</div>
            </div>
        </div>
        <div class="col-6 col-md-3 mt-2">
            <div class="adm-kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #ef4444 !important;">
                <div class="d-flex justify-content-between align-items-center"><span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem;">Chỉ Tiêu Còn Nhận</span><i class="bi bi-shield-exclamation text-danger fs-5"></i></div>
                <h3 class="fw-extrabold text-white mt-2 mb-0">${kpiCt - kpiNh}</h3>
                <div class="text-danger mt-1" style="font-size: 0.7rem;">Cần gọi bổ sung đợt sau</div>
            </div>
        </div>

        <div class="col-12 mt-3">
            <div class="glass-panel p-3 rounded-4 shadow-sm border border-info border-opacity-25">
                <h6 class="text-info fw-bold mb-3 small text-uppercase">📋 BẢNG TỔNG HỢP HỒ SƠ & TRÚNG TUYỂN 2026 (${dotName})</h6>
                <div class="table-responsive custom-scrollbar" style="max-height: 400px;">
                    <table class="table adm-glass-table mb-0" style="min-width: 900px;">
                        <thead>
                            <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                                <th class="text-center">STT</th>
                                <th>Tên Ngành</th>
                                <th class="text-center text-primary">NV1</th>
                                <th class="text-center">NV2</th>
                                <th class="text-center">NV3</th>
                                <th class="text-center text-warning">Gọi Trúng Tuyển</th>
                                <th class="text-center text-success">Thực Nhập Học</th>
                                <th class="text-center text-white-50">Chỉ Tiêu</th>
                                <th class="text-center text-danger">Còn Nhận</th>
                            </tr>
                        </thead>
                        <tbody>${htmlTable}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="col-12 mt-4">
            <h6 class="text-warning fw-bold mb-3 small text-uppercase">📊 BÁO CÁO NHÂN KHẨU HỌC THÍ SINH TRÚNG TUYỂN (${dotName})</h6>
            <div class="row g-4">
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-warning border-opacity-25">
                        <h6 class="text-warning fw-bold mb-2 small text-uppercase">🚻 GIỚI TÍNH</h6>
                        <div style="height: 350px;"><canvas id="chart_gioi_tinh"></canvas></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-info border-opacity-25">
                        <h6 class="text-info fw-bold mb-2 small text-uppercase">🎂 NĂM SINH</h6>
                        <div style="height: 350px;"><canvas id="chart_nam_sinh"></canvas></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-danger border-opacity-25">
                        <h6 class="text-danger fw-bold mb-2 small text-uppercase">📚 TỔ HỢP XÉT TUYỂN</h6>
                        <div style="height: 350px;"><canvas id="chart_to_hop"></canvas></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-purple border-opacity-25" style="border-color: rgba(192,132,252,0.25) !important;">
                        <h6 class="text-purple fw-bold mb-2 small text-uppercase" style="color: #c084fc !important;">📝 PHƯƠNG THỨC XÉT TUYỂN</h6>
                        <div style="height: 350px;"><canvas id="chart_phuong_thuc"></canvas></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-primary border-opacity-25">
                        <h6 class="text-primary fw-bold mb-2 small text-uppercase">📢 KÊNH TRUYỀN THÔNG</h6>
                        <div style="height: 350px;"><canvas id="chart_kenh"></canvas></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-success border-opacity-25">
                        <h6 class="text-success fw-bold mb-2 small text-uppercase">🗺️ TỈNH / THÀNH PHỐ NGUỒN</h6>
                        <div style="height: 400px;"><canvas id="chart_tinh_thanh"></canvas></div>
                    </div>
                </div>
                
                <div class="col-12">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100 border border-info border-opacity-25">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                            <h6 class="text-info fw-bold mb-0 small text-uppercase">🏫 TOP 20 TRƯỜNG THPT CÓ HỌC SINH TRÚNG TUYỂN</h6>
                            <select id="select_prov_for_school" class="form-select form-select-sm fw-bold border-secondary" style="width: 250px; font-size: 0.75rem;" onchange="window.renderSchoolChartByProv(this.value)">
                                <option value="ALL">-- Tất cả Tỉnh/Thành phố --</option>
                            </select>
                        </div>
                        <div style="height: 450px;"><canvas id="chart_truong_thpt"></canvas></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.renderAllImportantCharts, 50);
};

window.adm_school_data_cache = []; 

/**
 * 🌟 5. VẼ ĐỒNG LOẠT CÁC BIỂU ĐỒ (ĐÃ SỬA CỘT AM LÀM ĐIỀU KIỆN TRÚNG TUYỂN)
 */
window.renderAllImportantCharts = function() {
    if (!window.adm_raw_full_rows || window.adm_raw_full_rows.length < 2) return;

    let headerIdx = 0;
    for (let i = 0; i < Math.min(window.adm_raw_full_rows.length, 10); i++) {
        if (window.adm_raw_full_rows[i].join('').toLowerCase().includes('ngành nv1')) { headerIdx = i; break; }
    }

    const headers = window.adm_raw_full_rows[headerIdx].map(h => String(h||'').trim().toLowerCase());
    
    let colDot = headers.findIndex(h => h.includes('năm ts') || h.includes('đợt'));
    let colEmail = headers.findIndex(h => h.includes('xác nhận email'));

    let colTruong = headers.findIndex(h => h === 'tên trường' || h.includes('tên trường'));
    if (colTruong === -1) colTruong = 45; // Cột AT
    let colTinh = headers.findIndex(h => h === 'tên tỉnh/thành' || h.includes('tên tỉnh/thành') || h.includes('tỉnh/thành'));
    if (colTinh === -1) colTinh = 47; // Cột AV
    
    // Khớp lại cột AM làm điều kiện lọc biểu đồ
    if (colEmail === -1) colEmail = 38; // Ép về chỉ số 38 (Cột AM) nếu không tìm thấy tiêu đề
    if (colDot === -1) colDot = 36;     // Cột AK

    let targets = {
        'chart_gioi_tinh': { idx: headers.findIndex(h => h === 'giới' || h.includes('giới tính')), counts: {}, total: 0, name: 'Giới tính' },
        'chart_nam_sinh': { idx: headers.findIndex(h => h.includes('ngày sinh')), counts: {}, total: 0, name: 'Năm sinh' },
        'chart_to_hop': { idx: headers.findIndex(h => h.includes('tổ hợp')), counts: {}, total: 0, name: 'Tổ hợp môn' },
        'chart_phuong_thuc': { idx: headers.findIndex(h => h.includes('phương thức')), counts: {}, total: 0, name: 'Phương thức XT' },
        'chart_kenh': { idx: headers.findIndex(h => h.includes('kênh biết đến')), counts: {}, total: 0, name: 'Kênh truyền thông' },
        'chart_tinh_thanh': { idx: colTinh, counts: {}, total: 0, name: 'Tỉnh/Thành phố' }
    };

    window.adm_school_data_cache = [];
    let uniqueProvinces = new Set();
    let curFilter = window.adm_tuyen_sinh_dot;

    for (let i = headerIdx + 1; i < window.adm_raw_full_rows.length; i++) {
        let r = window.adm_raw_full_rows[i];
        if (!r || r.length <= 1) continue;

        // 🟢 LỌC CHÍNH XÁC THEO CỘT AM (XÁC NHẬN EMAIL)
        let valEmail = colEmail !== -1 && colEmail < r.length ? String(r[colEmail]||'').trim().toLowerCase() : '';
        if (valEmail === '' || valEmail === '—' || valEmail.includes('chưa')) continue;

        // Lọc theo Đợt tuyển sinh
        let valDot = colDot !== -1 && colDot < r.length ? String(r[colDot] || '').trim().toLowerCase() : '';
        if (valDot !== '' && valDot.includes('202') && !valDot.includes('2026')) continue; 
        if (curFilter === 'DOT1' && !(valDot.includes('đợt 1') || valDot.includes('dot1') || valDot.includes('đợt1'))) continue;
        if (curFilter === 'DOT2' && !(valDot.includes('đợt 2') || valDot.includes('dot2') || valDot.includes('đợt2'))) continue;

        // Đếm dữ liệu cho các biểu đồ
        Object.keys(targets).forEach(chartId => {
            let target = targets[chartId];
            if (target.idx === -1 || target.idx >= r.length) return;
            
            let val = String(r[target.idx] || '').trim();
            if (val === '' || val === '—' || val.toLowerCase() === 'undefined') return;

            if (chartId === 'chart_nam_sinh') {
                let matchYear = val.match(/(\d{4})/);
                if (matchYear) val = "Năm " + matchYear[1];
            }

            target.counts[val] = (target.counts[val] || 0) + 1;
            target.total++;
        });

        // Đếm dữ liệu cho trường THPT
        let valTinh = colTinh !== -1 && colTinh < r.length ? String(r[colTinh] || '').trim() : '';
        let valTruong = colTruong !== -1 && colTruong < r.length ? String(r[colTruong] || '').trim() : '';
        
        if (valTinh && valTinh !== '—' && valTinh !== 'undefined') uniqueProvinces.add(valTinh);
        if (valTruong && valTruong !== '—' && valTinh) {
            window.adm_school_data_cache.push({ prov: valTinh, school: valTruong });
        }
    }

    const basePalette = ['#38bdf8', '#c084fc', '#facc15', '#10b981', '#f472b6', '#f97316', '#a855f7', '#06b6d4', '#4ade80', '#fbbf24', '#fb7185', '#34d399'];
    let dotName = window.adm_tuyen_sinh_dot === 'ALL_DOTS' ? 'Tất cả Đợt' : (window.adm_tuyen_sinh_dot === 'DOT1' ? 'Đợt 1' : 'Đợt 2');

    Object.keys(targets).forEach(chartId => {
        let target = targets[chartId];
        let el = document.getElementById(chartId);
        if (!el || target.total === 0) return;

        let sortedData = Object.keys(target.counts).map(k => ({ label: k, count: target.counts[k] })).sort((a, b) => b.count - a.count);
        let labels = sortedData.map(d => `${d.label} (${((d.count/target.total)*100).toFixed(1)}%)`);
        let counts = sortedData.map(d => d.count);

        if (window.stat_adm_charts[chartId]) window.stat_adm_charts[chartId].destroy();

        let isPie = sortedData.length <= 8 && chartId !== 'chart_tinh_thanh';
        let bgColors = labels.map((_, i) => basePalette[i % basePalette.length]);
        let borderColors = isPie ? '#0f172a' : labels.map((_, i) => basePalette[i % basePalette.length].replace(')', ', 1)').replace('rgb', 'rgba'));

        window.stat_adm_charts[chartId] = new Chart(el.getContext('2d'), {
            type: isPie ? 'doughnut' : 'bar',
            data: {
                labels: labels,
                datasets: [{ label: `SL Trúng tuyển theo ${target.name} (${dotName})`, data: counts, backgroundColor: bgColors, borderColor: borderColors, borderWidth: isPie ? 2 : 1, borderRadius: isPie ? 0 : 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: isPie ? '50%' : undefined, plugins: { legend: { position: isPie ? 'right' : 'top', labels: { color: '#fff', padding: 15, font: { size: 11, family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } } } }, scales: isPie ? {} : { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } } } }
        });
    });

    let selProv = document.getElementById('select_prov_for_school');
    if (selProv) {
        let html = '<option value="ALL">-- Tất cả Tỉnh/Thành phố --</option>';
        Array.from(uniqueProvinces).sort().forEach(p => { html += `<option value="${p}">📍 ${p}</option>`; });
        selProv.innerHTML = html;
    }
    window.renderSchoolChartByProv('ALL');
};

/**
 * 🌟 6. HÀM VẼ BIỂU ĐỒ TRƯỜNG THPT THEO TỈNH
 */
window.renderSchoolChartByProv = function(selectedProv) {
    let counts = {};
    let total = 0;

    window.adm_school_data_cache.forEach(item => {
        if (selectedProv === 'ALL' || item.prov === selectedProv) {
            let key = selectedProv === 'ALL' ? `${item.school} (${item.prov})` : item.school;
            counts[key] = (counts[key] || 0) + 1;
            total++;
        }
    });

    if (total === 0) return;

    let sortedData = Object.keys(counts).map(k => ({ label: k, count: counts[k] })).sort((a, b) => b.count - a.count);
    if (sortedData.length > 20) sortedData = sortedData.slice(0, 20);

    let labels = sortedData.map(d => `${d.label} (${((d.count/total)*100).toFixed(1)}%)`);
    let data = sortedData.map(d => d.count);

    if (window.stat_adm_charts['chart_truong_thpt']) window.stat_adm_charts['chart_truong_thpt'].destroy();

    const basePalette = ['#38bdf8', '#c084fc', '#facc15', '#10b981', '#f472b6', '#f97316', '#a855f7', '#06b6d4', '#4ade80', '#fbbf24', '#fb7185', '#34d399'];
    let bgColors = labels.map((_, i) => basePalette[i % basePalette.length]);
    let borderColors = labels.map((_, i) => basePalette[i % basePalette.length].replace(')', ', 1)').replace('rgb', 'rgba'));

    let dotName = window.adm_tuyen_sinh_dot === 'ALL_DOTS' ? 'Tất cả Đợt' : (window.adm_tuyen_sinh_dot === 'DOT1' ? 'Đợt 1' : 'Đợt 2');
    let titleStr = selectedProv === 'ALL' ? `Trường THPT (Toàn quốc) - ${dotName}` : `Trường THPT tại ${selectedProv} - ${dotName}`;

    window.stat_adm_charts['chart_truong_thpt'] = new Chart(document.getElementById('chart_truong_thpt').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: `SL Trúng tuyển theo ${titleStr}`, data: data, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1, borderRadius: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#fff', font: { size: 11, family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } } } },
            scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } } }
        }
    });
};

window.populateDynamicColumnDropdown = function() {
    let sel = document.getElementById('select_dynamic_chart_col');
    if (!sel || window.adm_raw_full_rows.length < 2) return;

    // Tìm dòng tiêu đề
    let headerIdx = 0;
    for (let i = 0; i < Math.min(window.adm_raw_full_rows.length, 10); i++) {
        if (window.adm_raw_full_rows[i].join('').toLowerCase().includes('ngành nv1')) { headerIdx = i; break; }
    }

    let headers = window.adm_raw_full_rows[headerIdx].map(h => String(h||'').trim());
    
    // Khai báo bộ từ điển Icon đẹp cho các trường trọng điểm
    let importantFields = {
        'giới': '🚻 Giới tính',
        'giới tính': '🚻 Giới tính',
        'ngày sinh': '🎂 Năm sinh',
        'nơi sinh': '🏥 Nơi sinh',
        'tỉnh/thành': '🗺️ Tỉnh / Thành phố',
        'tỉnh thành': '🗺️ Tỉnh / Thành phố',
        'năm tn': '🎓 Năm tốt nghiệp',
        'năm tốt nghiệp': '🎓 Năm tốt nghiệp',
        'ngành nv1': '🥇 Ngành NV1',
        'ngành nv2': '🥈 Ngành NV2',
        'ngành nv3': '🥉 Ngành NV3',
        'phương thức xt': '📝 Phương thức XT',
        'phương thức': '📝 Phương thức XT',
        'tổ hợp môn': '📚 Tổ hợp xét tuyển',
        'kênh biết đến': '📢 Kênh truyền thông'
    };

    let html = `<option value="">-- Chọn Trường Dữ Liệu Phân Tích --</option>`;
    let group1 = `<optgroup label="🌟 THÔNG TIN TRỌNG ĐIỂM">`;
    let group2 = `<optgroup label="📊 CÁC TRƯỜNG DỮ LIỆU KHÁC">`;

    headers.forEach((h, idx) => {
        let lowerH = h.toLowerCase();
        // Ẩn các cột thừa
        if (!h || ['#','hành động','cccd','sđt','email','thí sinh','họ tên','link kích hoạt'].includes(lowerH)) return;

        let matchedKey = Object.keys(importantFields).find(k => lowerH === k);
        if (matchedKey) {
            group1 += `<option value="${idx}">${importantFields[matchedKey]}</option>`;
        } else {
            group2 += `<option value="${idx}">💠 ${h}</option>`;
        }
    });

    group1 += `</optgroup>`;
    group2 += `</optgroup>`;

    sel.innerHTML = html + group1 + group2;
    sel.dataset.headerIdx = headerIdx;
};

window.generateCustomColumnChart = function(colValue) {
    if (colValue === "") return;
    let idx = parseInt(colValue);
    let sel = document.getElementById('select_dynamic_chart_col');
    let headerIdx = parseInt(sel.dataset.headerIdx);

    // Lấy tên cột đang được chọn (lấy theo text có chứa Icon ở thẻ option)
    let selectedOptionText = sel.options[sel.selectedIndex].text;
    let colNameRaw = String(window.adm_raw_full_rows[headerIdx][idx] || '').trim().toLowerCase();
    
    let valCounts = {};
    let total = 0;

    let dotCol = window.adm_raw_full_rows[headerIdx].findIndex(h => String(h).toLowerCase().includes('năm ts'));
    let emailCol = window.adm_raw_full_rows[headerIdx].findIndex(h => String(h).toLowerCase().includes('xác nhận email'));

    for (let i = headerIdx + 1; i < window.adm_raw_full_rows.length; i++) {
        let r = window.adm_raw_full_rows[i];
        if (!r || r.length <= idx) continue;

        // 🟢 CHỈ VẼ BIỂU ĐỒ CHO NHỮNG EM TRÚNG TUYỂN (CÓ XÁC NHẬN EMAIL)
        let valEmail = emailCol !== -1 && emailCol < r.length ? String(r[emailCol]||'').trim().toLowerCase() : '';
        let isTrungTuyen = valEmail !== '' && valEmail !== '—' && !valEmail.includes('chưa');
        if (!isTrungTuyen) continue;

        // LỌC THEO ĐỢT "2026"
        if (window.adm_tuyen_sinh_dot !== 'ALL_DOTS' && dotCol !== -1) {
            let valDot = String(r[dotCol] || '').toLowerCase();
            if (!valDot.includes('2026')) continue;
            if (window.adm_tuyen_sinh_dot === 'DOT1' && !(valDot.includes('đợt 1') || valDot.includes('dot1') || valDot.includes('đợt1'))) continue;
            if (window.adm_tuyen_sinh_dot === 'DOT2' && !(valDot.includes('đợt 2') || valDot.includes('dot2') || valDot.includes('đợt2'))) continue;
        }

        let val = String(r[idx] || '').trim();
        if (val === '' || val === '—' || val === 'undefined') continue;

        // Gom nhóm Năm sinh
        if (colNameRaw.includes('ngày sinh')) {
            let matchYear = val.match(/(\d{4})/);
            if (matchYear) val = "Năm " + matchYear[1];
        }
        // Gom nhóm Điểm số
        else if (colNameRaw.includes('điểm')) {
            let score = parseFloat(val.replace(',', '.'));
            if (!isNaN(score) && score > 0) {
                if (score < 18) val = "< 18.0 điểm";
                else if (score < 20) val = "18.0 - 19.9 điểm";
                else if (score < 22) val = "20.0 - 21.9 điểm";
                else if (score < 24) val = "22.0 - 23.9 điểm";
                else if (score < 26) val = "24.0 - 25.9 điểm";
                else val = ">= 26.0 điểm";
            }
        }

        valCounts[val] = (valCounts[val] || 0) + 1;
        total++;
    }

    if (total === 0) {
        alert("Chưa có danh sách Trúng tuyển cho Đợt này ở Cột dữ liệu này!");
        return;
    }

    // Sắp xếp dữ liệu giảm dần
    let sortedData = Object.keys(valCounts).map(k => ({ label: k, count: valCounts[k] })).sort((a, b) => b.count - a.count);
    
    // Nếu có quá nhiều Label (> 15), ta gom các phần tử nhỏ nhất vào nhóm "Khác" cho biểu đồ Pie đỡ rối
    let MAX_PIE_SLICES = 8;
    let isPie = sortedData.length <= MAX_PIE_SLICES;
    
    if (isPie && sortedData.length > 5) {
        // Tùy chọn: Biểu đồ Pie hoặc Donut sẽ trông đẹp nếu data <= 6-8 lát
    }

    let labels = sortedData.map(d => `${d.label} (${((d.count/total)*100).toFixed(1)}%)`);
    let counts = sortedData.map(d => d.count);

    if (window.stat_adm_charts.customColChart) window.stat_adm_charts.customColChart.destroy();
    
    // Bảng màu rực rỡ và chuyên nghiệp
    const basePalette = ['#38bdf8', '#c084fc', '#facc15', '#10b981', '#f472b6', '#f97316', '#a855f7', '#06b6d4', '#4ade80', '#fbbf24', '#fb7185', '#34d399'];
    const bgColors = labels.map((_, i) => basePalette[i % basePalette.length]);

    // Tạo hiệu ứng 3D nhẹ cho biểu đồ Cột
    const borderColors = labels.map((_, i) => basePalette[i % basePalette.length].replace(')', ', 1)').replace('rgb', 'rgba'));

    window.stat_adm_charts.customColChart = new Chart(document.getElementById('chartCustomColumnDynamic').getContext('2d'), {
        type: isPie ? 'doughnut' : 'bar',
        data: { 
            labels: labels, 
            datasets: [{ 
                label: `Trúng tuyển theo ${selectedOptionText.replace(/💠 |🚻 |🎂 |🏥 |🗺️ |🎓 |🥇 |🥈 |🥉 |📝 |📚 |📢 /g, '')}`, 
                data: counts, 
                backgroundColor: bgColors,
                borderColor: isPie ? '#0f172a' : borderColors,
                borderWidth: isPie ? 2 : 1,
                borderRadius: isPie ? 0 : 6
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: isPie ? '50%' : undefined, // Tạo biểu đồ vành khăn (Donut) đẹp hơn Pie
            plugins: { 
                legend: { 
                    position: isPie ? 'right' : 'top', 
                    labels: { color: '#fff', padding: 15, font: { size: 11, family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } } 
                } 
            }, 
            scales: isPie ? {} : { 
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, 
                x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } } 
            } 
        }
    });
};