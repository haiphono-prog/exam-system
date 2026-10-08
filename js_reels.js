// =========================================================================
// 🎬 MODULE LUYỆN NGHE REELS - GIAO DIỆN TIKTOK TRÀN VIỀN & VUỐT (BẢN CHUẨN IPAD/SAFARI)
// =========================================================================

// [DEBUG TẬN GỐC] Bẫy lỗi Safari
window.addEventListener('error', e => alert('JS lỗi: ' + e.message + ' (dòng ' + e.lineno + ')'));
window.addEventListener('unhandledrejection', e => alert('Promise lỗi: ' + e.reason));

window.currentReelsList = []; 
window.currentReelIndex = -1; 
window.ytPlayerInstance = null;
window.isYtApiReady = false;

window.onYouTubeIframeAPIReady = function() { window.isYtApiReady = true; };

(function loadYTApi() {
    if (window.YT && window.YT.Player) { window.isYtApiReady = true; return; }
    let tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    else document.head.appendChild(tag);
})();

// 1. GỌI GIAO DIỆN REELS (CHUẨN TIKTOK)
window.openReelsModule = function() {
    if (typeof closePhanXaModule === 'function') closePhanXaModule(); 
    let wrapper = document.getElementById('reels_module_wrapper');
    
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'reels_module_wrapper';
        wrapper.className = 'position-fixed top-0 start-0 w-100 h-100 animate__animated animate__fadeInUp';
        wrapper.style.cssText = 'background: #000; z-index: 99999; overflow: hidden;';
        
        wrapper.innerHTML = `
        <style>
            /* CSS Lõi Unified Design & Super App */
            .unified-input { padding: 10px 15px !important; border-radius: 12px !important; font-size: 0.95rem !important; height: 48px !important; line-height: 1.5 !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important; background: #1a1d20 !important; border: 1px solid #2b3035 !important; color: #fff !important; }
            .unified-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important; outline: none; }
            .dark-label { font-size: 0.75rem; font-weight: 700; color: #adb5bd; margin-bottom: 4px; letter-spacing: 0.5px; }
            
            /* CSS Giao diện TikTok - Nút trong suốt viền trắng */
            .action-btn { width: 42px; height: 42px; border-radius: 50%; background: transparent; display: flex; justify-content: center; align-items: center; font-size: 1.3rem; color: #fff; margin-bottom: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid rgba(255, 255, 255, 0.85); transition: 0.2s; cursor: pointer; }
            .action-btn:hover { border-color: #fff; transform: scale(1.05); }
            .action-btn:active { transform: scale(0.9); }
            
            /* Bottom Sheet Animation */
            .bottom-sheet { position: absolute; bottom: 0; left: 0; width: 100%; max-height: 85vh; background: #1a1d20; border-top-left-radius: 20px; border-top-right-radius: 20px; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 100007; color: #fff; box-shadow: 0 -5px 25px rgba(0,0,0,0.7); display: flex; flex-direction: column; }
            .bottom-sheet.show { transform: translateY(0); }
            .sheet-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); z-index: 100006; opacity: 0; pointer-events: none; transition: 0.3s; backdrop-filter: blur(2px); }
            .sheet-overlay.show { opacity: 1; pointer-events: auto; }

            /* Grid Card Thumbnail */
            .reels-grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; padding-bottom: 20px; }
            .reel-thumb-card { position: relative; aspect-ratio: 9/16; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
            .reel-thumb-card.active { border: 2px solid #0ea5e9 !important; box-shadow: 0 0 15px rgba(14, 165, 233, 0.5); }
            .reel-thumb-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
            .reel-thumb-overlay { position: absolute; bottom: 0; left: 0; right: 0; top: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.1) 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 8px; pointer-events: none; }
            .reel-thumb-title { font-size: 0.75rem; font-weight: 600; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
            
            /* Hiệu ứng vuốt chuyển bài mượt mà */
            @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes slideInDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
            .slide-up-anim { animation: slideInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
            .slide-down-anim { animation: slideInDown 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        </style>

        <div class="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column">
            
            <!-- VIDEO CONTAINER TRÀN VIỀN -->
            <div id="videoContainer" class="flex-grow-1 position-relative w-100" style="background: #000;">
                <div id="ytPlayerTarget" class="text-white-50 text-center p-4 w-100 h-100 d-flex flex-column justify-content-center align-items-center">
                    <i class="bi bi-play-circle fs-1 text-info mb-2"></i><br>Đang khởi tạo Player...
                </div>
            </div>

            <!-- TẤM CHẮN VUỐT (Bảo vệ để Iframe không nuốt mất vuốt) -->
            <div class="position-absolute top-0 start-0 w-100 h-100" style="z-index: 5; pointer-events: none;">
                <!-- Vùng vuốt mép trái và đỉnh -->
                <div class="position-absolute top-0 start-0 h-100 swipe-catcher" style="width: 20%; pointer-events: auto;"></div>
                <div class="position-absolute top-0 start-0 w-100 swipe-catcher" style="height: 15%; pointer-events: auto;"></div>
            </div>

            <!-- HEADER NỔI XUỐNG -->
            <div class="position-absolute top-0 start-0 w-100 p-3 d-flex justify-content-between align-items-center" style="z-index: 10; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); padding-top: max(env(safe-area-inset-top), 1rem) !important;">
                <button class="btn text-white fs-2 shadow-none p-0 d-flex align-items-center" onclick="closeReelsModule()">
                    <i class="bi bi-chevron-left" style="text-shadow: 1px 1px 3px #000;"></i>
                </button>
                <span class="text-white fw-bold fs-5 text-uppercase" style="text-shadow: 1px 1px 3px #000; letter-spacing: 1px;">Luyện Nghe Reels</span>
                <div style="width: 30px;"></div>
            </div>

            <!-- THANH CÔNG CỤ TIKTOK (Bên Phải - Tối giản) -->
            <div class="position-absolute end-0 d-flex flex-column align-items-center" style="bottom: 12%; z-index: 10; padding-right: 15px;">
                <!-- Nút Thư viện -->
                <div class="text-center" onclick="window.toggleSheet('playlistSheet')">
                    <div class="action-btn" title="Thư viện"><i class="bi bi-collection-play" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);"></i></div>
                </div>
                
                <!-- Nút Dán Link -->
                <div class="text-center" onclick="window.toggleSheet('addLinkSheet')">
                    <div class="action-btn" title="Dán Link"><i class="bi bi-link-45deg fs-3" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);"></i></div>
                </div>
                
                <!-- Nút Lưu Clip -->
                <div class="text-center" onclick="window.openReelsModal()">
                    <div class="action-btn" title="Lưu Clip"><i class="bi bi-bookmark-star" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);"></i></div>
                </div>
            </div>

            <!-- CHÂN TRANG THÔNG TIN -->
            <div class="position-absolute bottom-0 start-0 w-100 p-3 pb-4" style="z-index: 10; background: linear-gradient(to top, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.5) 60%, transparent); padding-bottom: max(env(safe-area-inset-bottom), 1.5rem) !important;">
                <div style="padding-right: 70px;">
                    <div class="badge bg-info text-dark mb-2 rounded-pill fw-bold"><i class="bi bi-music-note-beamed me-1"></i> Clip Đang Phát</div>
                    <h6 class="text-white fw-bold mb-2 lh-base" id="currentReelTitle" style="text-shadow: 1px 1px 3px #000; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">Đang tải dữ liệu...</h6>
                    
                    <div class="d-flex align-items-center gap-2 mt-3">
                        <button class="btn btn-sm rounded-pill text-white border-secondary px-3" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(4px);" onclick="window.playPrevReel()"><i class="bi bi-arrow-up text-info fw-bold"></i></button>
                        <button class="btn btn-sm rounded-pill text-white border-secondary px-3" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(4px);" onclick="window.playNextReel()"><i class="bi bi-arrow-down text-info fw-bold"></i></button>
                        <span class="text-white-50 small ms-2 fw-bold"><i class="bi bi-hand-index-thumb me-1"></i>Vuốt để chuyển</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- MÀN CHẮN TỐI (Dành cho Bottom Sheets) -->
        <div id="sheetOverlay" class="sheet-overlay" onclick="window.closeAllSheets()"></div>

        <!-- BOTTOM SHEET 1: DANH SÁCH THƯ VIỆN -->
        <div id="playlistSheet" class="bottom-sheet flex-column">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="border-radius: 20px 20px 0 0;">
                <h6 class="mb-0 fw-bold text-info"><i class="bi bi-grid-3x3-gap-fill me-2"></i>Danh sách Clip (<span id="reelTotalCount">0</span>)</h6>
                <button class="btn shadow-none p-0 border-0 bg-transparent" onclick="window.toggleSheet('playlistSheet')"><i class="bi bi-x-circle-fill text-white-50 fs-4"></i></button>
            </div>
            <div class="p-3 flex-shrink-0 border-bottom border-dark">
                <select id="librarySelector" class="form-select unified-input w-100" onchange="window.loadSavedReels()">
                    <option value="reelscongdong">📚 Thư viện Hệ thống</option>
                </select>
            </div>
            <div class="p-3 flex-grow-1 overflow-auto custom-scrollbar" id="reelsListContainer" style="padding-bottom: env(safe-area-inset-bottom);"></div>
        </div>

        <!-- BOTTOM SHEET 2: THÊM LINK NGOÀI -->
        <div id="addLinkSheet" class="bottom-sheet">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="border-radius: 20px 20px 0 0;">
                <h6 class="mb-0 fw-bold text-info"><i class="bi bi-link-45deg me-2 fs-5"></i>Phát từ Link</h6>
                <button class="btn shadow-none p-0 border-0 bg-transparent" onclick="window.toggleSheet('addLinkSheet')"><i class="bi bi-x-circle-fill text-white-50 fs-4"></i></button>
            </div>
            <div class="p-4 flex-grow-1" style="padding-bottom: max(env(safe-area-inset-bottom), 3rem) !important;">
                <div class="dark-label">DÁN LINK YOUTUBE / FB / TIKTOK VÀO ĐÂY:</div>
                <div class="d-flex gap-2">
                    <input type="text" id="reelUrl" class="form-control unified-input flex-grow-1" placeholder="https://..." onclick="this.select()">
                    <button class="btn btn-info text-white rounded-3 px-4 fw-bold" onclick="window.loadReelVideo(); window.toggleSheet('addLinkSheet');">PHÁT</button>
                </div>
            </div>
        </div>

        <!-- BOTTOM SHEET 3: LƯU CLIP (SUPER APP FORM) -->
        <div id="reelsSaveModal" class="bottom-sheet flex-column">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="border-radius: 20px 20px 0 0;">
                <div class="text-center w-100 text-info fw-bold" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                    <i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU VÀO THƯ VIỆN
                </div>
            </div>
            <div class="p-3 flex-grow-1 overflow-auto custom-scrollbar">
                <div class="p-3 rounded-4" style="background: rgba(0,0,0,0.2);">
                    <div class="dark-label">TÊN CLIP MÔ TẢ</div>
                    <input type="text" id="reelCustomName" class="form-control unified-input w-100 mb-4" placeholder="Nhập tên mô tả cho clip..." onclick="this.select()">
                    
                    <div class="dark-label mb-2">CHỌN NƠI LƯU (CÓ THỂ CHỌN NHIỀU)</div>
                    <div id="reelsTargetList" class="text-white"></div>
                </div>
            </div>
            <div class="mt-auto d-flex w-100 bg-dark flex-shrink-0" style="padding-bottom: env(safe-area-inset-bottom);">
                <button class="btn py-3 fw-bold flex-grow-1 text-white border-0 rounded-0" style="font-size: 1.1rem; background: #334155;" onclick="window.closeAllSheets()">HỦY BỎ</button>
                <button id="btnSubmitSave" class="btn btn-info py-3 fw-bold flex-grow-1 text-white border-0 border-start border-dark rounded-0" style="font-size: 1.1rem; background: linear-gradient(135deg, #0ea5e9, #0284c7);" onclick="window.submitSaveReels()">XÁC NHẬN LƯU</button>
            </div>
        </div>

        `;
        document.body.appendChild(wrapper);
        
        // --- 🌟 TOUCH EVENT LẮNG NGHE VUỐT TIKTOK ---
        let tsY = 0;
        wrapper.addEventListener('touchstart', e => { 
            if (e.target.closest('.bottom-sheet')) return; // Không bắt sự kiện khi đang vuốt bên trong bảng Menu
            tsY = e.changedTouches[0].screenY; 
        }, {passive: true});
        
        wrapper.addEventListener('touchend', e => {
            if (e.target.closest('.bottom-sheet')) return;
            let teY = e.changedTouches[0].screenY;
            if (tsY - teY > 70) window.playNextReel(); // Vuốt Lên MẠNH -> Next
            else if (teY - tsY > 70) window.playPrevReel(); // Vuốt Xuống MẠNH -> Prev
        }, {passive: true});
    }
    
    wrapper.style.display = 'block';
    document.body.style.overflow = 'hidden';
    let fab = document.getElementById('fab_menu_items');
    if (fab) fab.classList.add('d-none');
    
    window.updateReelsLibrarySelector();
    window.loadSavedReels();
};

window.closeReelsModule = function() {
    let wrapper = document.getElementById('reels_module_wrapper');
    if (wrapper) wrapper.style.display = 'none';
    document.body.style.overflow = ''; 
    let fab = document.getElementById('fab_menu_items');
    if (fab) fab.classList.remove('d-none');
    
    let container = document.getElementById('videoContainer');
    if (container) {
        // 🛑 DIỆT LỖI TRÀN RAM IPAD KHI THOÁT
        let oldIframes = container.querySelectorAll('iframe');
        oldIframes.forEach(ifr => { 
            ifr.src = 'about:blank'; // Ép Safari cắt đứt luồng tải video
            ifr.remove(); 
        });
        container.innerHTML = '';
    }
    
    if (window.ytPlayerInstance) { 
        try { window.ytPlayerInstance.destroy(); } catch(e){} 
        window.ytPlayerInstance = null; 
    }
};

// =========================================================================
// XỬ LÝ GIAO DIỆN BOTTOM SHEETS (MENU TRƯỢT TỪ DƯỚI LÊN)
// =========================================================================
window.toggleSheet = function(id) {
    let sheet = document.getElementById(id);
    let overlay = document.getElementById('sheetOverlay');
    if(sheet.classList.contains('show')) {
        sheet.classList.remove('show');
        overlay.classList.remove('show');
    } else {
        window.closeAllSheets(); 
        sheet.classList.add('show');
        overlay.classList.add('show');
    }
};

window.closeAllSheets = function() {
    document.querySelectorAll('.bottom-sheet').forEach(el => el.classList.remove('show'));
    let overlay = document.getElementById('sheetOverlay');
    if(overlay) overlay.classList.remove('show');
};

// =========================================================================
// CÁC HÀM XỬ LÝ MEDIA (NHẬN DIỆN URL & TẠO ẢNH BÌA)
// =========================================================================
window.detectVideoPlatform = function(rawUrl) {
    if (!rawUrl) return null;
    let url = String(rawUrl).trim();
    try { url = decodeURIComponent(url); } catch(e){}
    try { url = decodeURIComponent(url); } catch(e){}

    let ytRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    let ytMatch = url.match(ytRegExp);
    if (!ytMatch) { let directMatch = url.match(/^([a-zA-Z0-9_-]{11})$/); if (directMatch) ytMatch = directMatch; }
    if (ytMatch && ytMatch[1]) return { platform: 'youtube', id: ytMatch[1], url: url };

    if (url.indexOf('facebook.com') !== -1 || url.indexOf('fb.watch') !== -1) return { platform: 'facebook', url: url };
    if (url.indexOf('instagram.com') !== -1) {
        let igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
        if (igMatch && igMatch[1]) return { platform: 'instagram', id: igMatch[1], url: url };
    }
    if (url.indexOf('tiktok.com') !== -1) {
        let tkMatch = url.match(/video\/(\d+)/);
        if (tkMatch && tkMatch[1]) return { platform: 'tiktok', id: tkMatch[1], url: url };
    }
    return null; 
};

window.getReelThumbnail = function(videoInfo) {
    if (!videoInfo) return 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300&auto=format&fit=crop';
    if (videoInfo.platform === 'youtube') return 'https://img.youtube.com/vi/' + videoInfo.id + '/hqdefault.jpg';
    
    if (videoInfo.platform === 'tiktok') {
        let svgTikTok = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="533" viewBox="0 0 300 533"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#010101"/><stop offset="50%" stop-color="#121212"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><g transform="translate(100, 216) scale(2.5)"><path fill="#fe2c55" d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V0h-3.447v13.672a2.896 2.896 0 1 1-2.001-2.75v-3.51a6.34 6.34 0 1 0 5.448 6.26V8.196a8.213 8.213 0 0 0 4.77 1.524V6.273a4.838 4.838 0 0 1-1.000.413z"/><path fill="#25f4ee" d="M18.157 5.105a4.79 4.79 0 0 1-3.77-4.245V0h-2.12v13.672a2.896 2.896 0 1 1-2.001-2.75v-3.51a6.34 6.34 0 1 0 5.448 6.26V8.196a8.213 8.213 0 0 0 3.77 1.15V6.273c-.443 0-.88-.057-1.327-.168z"/></g></svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgTikTok);
    }
    if (videoInfo.platform === 'instagram') {
        let svgIG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="533" viewBox="0 0 300 533"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fdf497"/><stop offset="25%" stop-color="#fdf497"/><stop offset="50%" stop-color="#fd5949"/><stop offset="75%" stop-color="#d6249f"/><stop offset="100%" stop-color="#285AEB"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#ig)"/><g transform="translate(110, 226) scale(3)" fill="#ffffff"><path d="M8 0C3.58 0 0 3.58 0 8v10c0 4.42 3.58 8 8 8h10c4.42 0 8-3.58 8-8V8c0-4.42-3.58-8-8-8H8zm0 2.5h10c3.05 0 5.5 2.45 5.5 5.5v10c0 3.05-2.45 5.5-5.5 5.5H8C4.95 23.5 2.5 21.05 2.5 18V8c0-3.05 2.45-5.5 5.5-5.5zM18.75 4.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM13 7a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/></g></svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgIG);
    }
    if (videoInfo.platform === 'facebook') {
        let svgFB = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="533" viewBox="0 0 300 533"><defs><linearGradient id="fb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1877f2"/><stop offset="100%" stop-color="#003b8e"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#fb)"/><g transform="translate(110, 226) scale(3)" fill="#ffffff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></g></svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgFB);
    }
    return 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=300&auto=format&fit=crop';
};

window.updateReelsLibrarySelector = function() {
    let selector = document.getElementById('librarySelector');
    if (!selector) return;
    
    let rawUid = window.current_student_id || "guest";
    let uidLower = rawUid.toLowerCase();
    let role = window.current_user_role || "khach";
    let isAdmin = (role === 'admin' || role === 'all' || role === 'teacher' || uidLower === 'hai');

    let html = '<option value="reelscongdong">📚 Thư viện Hệ thống</option>';
    let allLibraries = [
        { id: "reelsmikel", label: "📁 Nhóm Mikel", owner: "mikel" },
        { id: "reelshai", label: "📁 Nhóm Hải", owner: "hai" },
        { id: "reelssenal", label: "📁 Nhóm Senal", owner: "senal" }
    ];

    allLibraries.forEach(lib => {
        if (isAdmin || lib.owner === uidLower) {
            html += `<option value="${lib.id}">${lib.label}</option>`;
        }
    });
    
    let currentVal = selector.value;
    selector.innerHTML = html;
    if (currentVal && selector.querySelector(`option[value="${currentVal}"]`)) selector.value = currentVal;
};

// =========================================================================
// LOGIC SUPABASE VÀ CHUYỂN BÀI MƯỢT MÀ
// =========================================================================
window.loadReelVideo = function() {
    let inputEl = document.getElementById('reelUrl');
    let rawInput = inputEl ? inputEl.value.trim() : "";
    if (!rawInput) return window.show_toast("Vui lòng dán link video vào ô!", false);
    window.playSavedReel(encodeURIComponent(rawInput), -1); 
};

window.loadSavedReels = async function() {
    let listContainer = document.getElementById('reelsListContainer');
    let countBadge = document.getElementById('reelTotalCount');
    let selector = document.getElementById('librarySelector');
    if (!listContainer) return;

    let targetLibrary = selector ? selector.value : "reelscongdong";
    listContainer.innerHTML = '<div class="text-center text-white-50 p-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải danh sách clip...</div>';

    try {
        const { data, error } = await db.from('reels')
                                        .select('*')
                                        .eq('library_id', targetLibrary)
                                        .order('created_at', { ascending: false });
        if (error) throw error;
        
        window.currentReelsList = data || []; 
        
        if (countBadge) countBadge.innerText = window.currentReelsList.length;
        if (selector && selector.options.length > 0) {
            let selectedOption = selector.options[selector.selectedIndex];
            selectedOption.text = selectedOption.text.split(' (')[0] + ' (' + window.currentReelsList.length + ')';
        }

        if (window.currentReelsList.length === 0) {
            listContainer.innerHTML = '<div class="text-white-50 text-center p-4">Chưa có clip nào trong kho này.</div>';
            return;
        }

        let html = '<div class="reels-grid-list">';
        window.currentReelsList.forEach((reel, index) => {
            let displayTitle = reel.title.trim();
            let safeUrl = encodeURIComponent(reel.url);
            
            let videoInfo = window.detectVideoPlatform(reel.url);
            let thumbImg = window.getReelThumbnail(videoInfo);
            
            let iconHtml = '<i class="bi bi-youtube text-danger reel-platform-icon"></i>';
            if (videoInfo && videoInfo.platform === 'facebook') iconHtml = '<i class="bi bi-facebook text-primary reel-platform-icon"></i>';
            else if (videoInfo && videoInfo.platform === 'tiktok') iconHtml = '<i class="bi bi-tiktok text-light reel-platform-icon"></i>';
            else if (videoInfo && videoInfo.platform === 'instagram') iconHtml = '<i class="bi bi-instagram text-warning reel-platform-icon"></i>';

            html += `<div class="reel-thumb-card" onclick="window.playSavedReel('${safeUrl}', ${index}); window.closeAllSheets();">
                        <img src="${thumbImg}" class="reel-thumb-img" alt="clip" onerror="this.src='https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300'">
                        <div class="reel-thumb-overlay">
                            <div class="d-flex justify-content-between align-items-center">${iconHtml}</div>
                            <div class="reel-thumb-title" title="${displayTitle}">${displayTitle}</div>
                        </div>
                    </div>`;
        });
        listContainer.innerHTML = html + '</div>';
        
        if (window.currentReelIndex === -1 || !window.currentReelsList[window.currentReelIndex]) {
            setTimeout(() => window.playSavedReel(encodeURIComponent(window.currentReelsList[0].url), 0), 300);
        }

    } catch (err) {
        listContainer.innerHTML = `<div class="text-danger text-center p-3">❌ Lỗi tải dữ liệu: ${err.message}</div>`;
    }
};



// HÀM YOUTUBE SDK (CHUẨN TỪ BẢN GAS CŨ)
window.playYouTubeSDK = function(videoId, retryCount) {
    if (typeof retryCount === 'undefined') retryCount = 0;
    if (!window.isYtApiReady && (typeof YT === 'undefined' || !YT.Player)) {
        if (retryCount < 15) { setTimeout(function() { window.playYouTubeSDK(videoId, retryCount + 1); }, 150); return; }
    }
    let container = document.getElementById('videoContainer');
    if (!container) return;
    if (!document.getElementById('ytPlayerTarget')) container.innerHTML = '<div id="ytPlayerTarget"></div>';

    if (typeof YT !== 'undefined' && YT.Player) {
        try {
            window.ytPlayerInstance = new YT.Player('ytPlayerTarget', {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0, 'modestbranding': 1, 'enablejsapi': 1 },
                events: {
                    'onReady': function(e) { e.target.playVideo(); },
                    'onStateChange': function(e) { if (e.data === YT.PlayerState.ENDED) window.playNextReel(); }
                }
            });
            return;
        } catch(e) { console.warn("Lỗi SDK", e); }
    }
    container.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&playsinline=1" style="width:100%;height:100%;border:none;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen="true"></iframe>';
};

// HÀM PHÁT VIDEO (ĐÃ TÍCH HỢP DỌN RAM CHỐNG VĂNG IPAD VÀ SANDBOX)
window.playSavedReel = function(encodedUrl, index, direction) {
    if (typeof index === 'undefined') index = -1;
    if (typeof direction === 'undefined') direction = 'next';
    window.currentReelIndex = index;
    
    let rawUrl = encodedUrl;
    try { rawUrl = decodeURIComponent(encodedUrl); } catch(e){}
    
    let inputEl = document.getElementById('reelUrl');
    if (inputEl) inputEl.value = rawUrl;

    let titleEl = document.getElementById('currentReelTitle');
    if (titleEl && window.currentReelsList[index]) {
        titleEl.innerText = window.currentReelsList[index].title;
    } else if (titleEl) {
        titleEl.innerText = "Clip đang phát (Link ngoài)";
    }

    let allCards = document.querySelectorAll('.reel-thumb-card');
    allCards.forEach((card, idx) => {
        if (idx === index) card.classList.add('active');
        else card.classList.remove('active');
    });

    let container = document.getElementById('videoContainer');
    if (!container) return;

    // HIỆU ỨNG VUỐT
    container.classList.remove('slide-up-anim', 'slide-down-anim');
    void container.offsetWidth; 
    if (direction === 'next') container.classList.add('slide-up-anim');
    else if (direction === 'prev') container.classList.add('slide-down-anim');
    
    // 🛑 BÍ QUYẾT DIỆT LỖI RAM IPAD TỪ GỢI Ý CỦA BẠN 🛑
    // Phá hủy Player Youtube cũ
    if (window.ytPlayerInstance) {
        try { if (typeof window.ytPlayerInstance.destroy === 'function') window.ytPlayerInstance.destroy(); } catch(err) {}
        window.ytPlayerInstance = null;
    }
    // Ép nhả RAM cho tất cả Iframe (Facebook, TikTok, IG) đang chạy ngầm
    let oldIframes = container.querySelectorAll('iframe');
    oldIframes.forEach(ifr => {
        ifr.src = 'about:blank'; // Cắt luồng dữ liệu lập tức
        ifr.remove(); // Xóa khỏi DOM
    });

    // Fallback UI
    let fallbackHtml = `
        <div class="mt-3 text-center position-absolute w-100" style="bottom: 25%; z-index: 10;">
            <p class="small text-white-50 mb-1" style="text-shadow: 1px 1px 2px #000;">Nếu video đen màn hình:</p>
            <a href="${rawUrl}" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-3 shadow-lg" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(5px);">
                <i class="bi bi-box-arrow-up-right me-1"></i> Mở nguồn video gốc
            </a>
        </div>
    `;

    container.innerHTML = `<div class="text-white-50 text-center w-100 h-100 d-flex flex-column justify-content-center align-items-center"><span class="spinner-border text-info mb-3" style="width: 3rem; height: 3rem;"></span>Đang tải video...</div>${fallbackHtml}`;
    void container.offsetHeight; 

    // Đợi giao diện dọn dẹp xong mới nạp video mới
    setTimeout(() => {
        let videoInfo = window.detectVideoPlatform(rawUrl);
        
        // [BẪY LỖI 1]: Kiểm tra hàm detectVideoPlatform có sống sót và tách đúng ID không
        alert('DEBUG 1 - videoInfo: ' + JSON.stringify(videoInfo));

        if (!videoInfo) {
            container.innerHTML = `<div class="text-white-50 text-center p-5 mt-5">Link chưa được hỗ trợ.</div>${fallbackHtml}`;
            return;
        }

        let oldSpans = container.querySelectorAll('.spinner-border, .text-white-50.text-center:not(.small)');
        oldSpans.forEach(el => el.remove());

        if (videoInfo.platform === 'youtube') {
            window.playYouTubeSDK(videoInfo.id);
        } else {
            let iframe = document.createElement('iframe');
            
            // Ép layout cứng để trị lỗi container xẹp về 0px của Safari, gỡ bỏ translateZ
            iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; web-share');
            iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            
            if (videoInfo.platform === 'facebook') {
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms allow-storage-access-by-user-activation');
                iframe.src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(videoInfo.url) + '&show_text=false&width=360';
            } else if (videoInfo.platform === 'instagram') {
                iframe.src = 'https://www.instagram.com/p/' + videoInfo.id + '/embed/';
            } else if (videoInfo.platform === 'tiktok') {
                iframe.src = 'https://www.tiktok.com/embed/v2/' + videoInfo.id;
            }
            
            // [BẪY LỖI 2]: Xác nhận iframe nạp xong nội dung chưa bị chặn ITP
            iframe.onload = () => alert('DEBUG 3 - iframe đã tải xong mạng');
            
            // Đảm bảo container cha làm gốc tọa độ cho inset:0
            container.style.position = 'relative';
            container.appendChild(iframe);
            
            // [BẪY LỖI 3]: Bắt bệnh chiều cao 0px của Safari
            alert('DEBUG 2 - Kích thước container: ' + container.offsetWidth + 'x' + container.offsetHeight);
        }
    }, 50);
};

window.playNextReel = function() {
    if (window.currentReelsList.length === 0) return;
    window.currentReelIndex = (window.currentReelIndex + 1) % window.currentReelsList.length; 
    window.playSavedReel(encodeURIComponent(window.currentReelsList[window.currentReelIndex].url), window.currentReelIndex, 'next');
};
window.playPrevReel = function() {
    if (window.currentReelsList.length === 0) return;
    window.currentReelIndex = (window.currentReelIndex - 1 + window.currentReelsList.length) % window.currentReelsList.length; 
    window.playSavedReel(encodeURIComponent(window.currentReelsList[window.currentReelIndex].url), window.currentReelIndex, 'prev');
};

window.openReelsModal = function() {
    if (!window.current_student_id || window.current_student_id === "guest") {
        return window.show_toast("⚠️ Bạn cần đăng nhập để lưu clip!", true);
    }
    
    let urlInput = document.getElementById('reelUrl');
    if (!urlInput || !urlInput.value.trim()) return window.show_toast("⚠️ Dán link vào ô trước khi lưu nhé!", true);

    let rawUid = window.current_student_id; 
    let uidLower = rawUid.toLowerCase(); 
    let role = window.current_user_role || "khach"; 
    let isAdmin = (role === 'admin' || role === 'all' || role === 'teacher' || uidLower === 'hai');

    let targetList = document.getElementById("reelsTargetList");
    targetList.innerHTML = ""; 

    let allLibraries = [
        { id: "reelscongdong", label: "📚 Thư viện Hệ thống" },
        { id: "reelsmikel", label: "📁 Nhóm Mikel" },
        { id: "reelshai", label: "📁 Nhóm Hải" },
        { id: "reelssenal", label: "📁 Nhóm Senal" }
    ];

    allLibraries.forEach(lib => {
        let canSee = (lib.id === "reelscongdong") || isAdmin || (lib.id === "reels" + uidLower);
        if (canSee) {
            let checkedAttr = lib.id === "reelscongdong" ? "checked" : "";
            targetList.innerHTML += `<div class="form-check mb-3">
                <input class="form-check-input reels-target-cb" type="checkbox" value="${lib.id}" id="cb_${lib.id}" ${checkedAttr} style="transform: scale(1.3); margin-top: 5px;">
                <label class="form-check-label text-white ms-2 fs-6" for="cb_${lib.id}">${lib.label}</label>
            </div>`;
        }
    });

    window.toggleSheet('reelsSaveModal');
};

window.submitSaveReels = async function() {
    let btnSubmit = document.getElementById("btnSubmitSave");
    btnSubmit.innerText = "ĐANG LƯU..."; btnSubmit.disabled = true;

    let title = document.getElementById('reelCustomName').value.trim() || "Clip Luyện Nghe";
    let url = document.getElementById('reelUrl').value.trim();
    
    let selectedNodes = document.querySelectorAll(".reels-target-cb:checked");
    let insertData = [];
    
    for (let i = 0; i < selectedNodes.length; i++) {
        insertData.push({
            title: title,              
            url: url,       
            library_id: selectedNodes[i].value, 
            owner_id: window.current_student_id || 'guest'
        });
    }

    if(insertData.length === 0) {
        window.show_toast("⚠️ Vui lòng chọn ít nhất 1 nơi lưu!", true);
        btnSubmit.innerText = "XÁC NHẬN LƯU"; btnSubmit.disabled = false;
        return;
    }

    try {
        const { error } = await db.from('reels').insert(insertData);
        if (error) throw error;
        
        window.show_toast("✅ Lưu Clip thành công!");
        window.closeAllSheets();
        window.loadSavedReels();
    } catch(err) {
        window.show_toast("❌ Lỗi khi lưu: " + err.message, true);
    } finally {
        btnSubmit.innerText = "XÁC NHẬN LƯU"; btnSubmit.disabled = false;
    }
};