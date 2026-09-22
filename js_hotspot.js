// =========================================================================
// 🎯 FRONTEND: MODULE TẠO CÂU HỎI HOTSPOT (BẢN V4 - KHÔI PHỤC MAGIC VOCAB API)
// =========================================================================

window.hotspot_temp_base64 = "";
window.hotspot_temp_coords = "";
window.hotspot_current_image_id = null; 
window.hs_pending_list = []; 

window.hotspot_multi_array = [];
window.hs_is_drawing = false;
window.hs_start_x = 0;
window.hs_start_y = 0;
window.hs_active_index = null; 

window.open_hotspot_creator_modal = function() {
    let oldModal = document.getElementById('hotspot_creator_modal');
    if(oldModal) oldModal.remove();

    window.hotspot_temp_base64 = ""; window.hotspot_temp_coords = "";
    window.hotspot_current_image_id = null; window.hs_pending_list = [];
    window.hotspot_multi_array = []; window.hs_active_index = null;

    let currentLessonNum = window.selected_lessons_text || "1";
    let currentLessonName = window.lessonNames?.[window.current_subject]?.[currentLessonNum] || "";

    let modalHtml = `
    <div id="hotspot_creator_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 28000; backdrop-filter: blur(10px); padding: 15px;">
        
        <div class="glass-panel p-2 p-md-3 shadow-lg w-100 h-100 d-flex flex-column flex-lg-row gap-3" style="max-width: 1400px; max-height: 96vh; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important;">
            
            <!-- 🌟 CỘT TRÁI: HÌNH ẢNH (DÒNG THÔNG BÁO ĐÃ DỜI RA NGOÀI ẢNH) -->
            <div class="flex-grow-1 h-100 bg-dark rounded-3 border border-secondary d-flex flex-column overflow-hidden p-2">
                
                <div class="flex-grow-1 position-relative d-flex align-items-center justify-content-center w-100">
                    <div id="hs_img_container" class="position-relative d-inline-block" style="display: none; touch-action: none; line-height: 0;"
                         onmousedown="window.start_draw_hotspot(event)" onmousemove="window.draw_hotspot(event)" onmouseup="window.end_draw_hotspot(event)" onmouseleave="window.end_draw_hotspot(event)"
                         ontouchstart="window.start_draw_hotspot(event)" ontouchmove="window.draw_hotspot(event)" ontouchend="window.end_draw_hotspot(event)">
                        
                        <img id="hs_img_preview" src="" style="max-width: 100%; max-height: 85vh; pointer-events: none; border-radius: 8px; object-fit: contain;">
                        
                        <div id="hs_multi_markers" class="position-absolute top-0 start-0 w-100 h-100" style="pointer-events: none; z-index: 9;"></div>
                        <div id="hs_temp_marker" class="position-absolute d-none" style="border: 2px dashed #ef4444; background: rgba(239,68,68,0.2); pointer-events: none; z-index: 10;"></div>
                        <div id="hs_saved_markers" class="position-absolute top-0 start-0 w-100 h-100" style="pointer-events: none;"></div>
                    </div>

                    <div id="hs_empty_state" class="text-white-50 text-center position-absolute w-100 top-50 translate-middle-y" style="pointer-events: none;">
                        <i class="bi bi-image" style="font-size: 4rem;"></i>
                        <div class="mt-2 fw-bold" style="font-size: 1.2rem;">Sử dụng nút góc phải hoặc nhấn <kbd class="bg-secondary text-white">Ctrl + V</kbd> để dán ảnh</div>
                    </div>
                </div>

                <div id="hs_coords_display" class="w-100 text-center mt-2 pb-1" style="display: none; flex-shrink: 0;">
                    <span id="hs_coords_text" class="text-warning small fw-bold bg-dark px-3 py-1 rounded-pill border border-secondary shadow-sm">Kéo chuột trên ảnh để tạo vùng chọn</span>
                </div>
            </div>

            <!-- 🌟 CỘT PHẢI: BẢNG ĐIỀU KHIỂN -->
            <div class="d-flex flex-column h-100" style="width: 100%; max-width: 360px; flex-shrink: 0;">
                
                <!-- TOP BAR GỘP CHUNG (ICON TẢI/DÁN, BÀI, TÊN, MULTI, HÌNH DÁNG) -->
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                    <div class="d-flex gap-1 align-items-center w-100 me-1">
                        
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-info p-0 d-flex align-items-center justify-content-center rounded" style="width: 28px; height: 28px;" onclick="window.paste_hotspot_image()" title="Dán ảnh (Ctrl+V)">
                                <i class="bi bi-clipboard-fill text-white"></i>
                            </button>
                            <label class="btn btn-sm btn-warning p-0 m-0 d-flex align-items-center justify-content-center rounded" style="width: 28px; height: 28px; cursor: pointer;" title="Tải ảnh lên">
                                <i class="bi bi-upload text-white"></i>
                                <input type="file" id="hs_file_input" class="d-none" accept="image/*" onchange="window.preview_hotspot_image(this)">
                            </label>
                        </div>

                        <input type="text" id="hs_lesson" class="text-info fw-bold p-0 text-center bg-dark border border-secondary rounded" style="width: 30px; height: 28px; outline: none; font-size: 0.8rem;" value="${currentLessonNum}" title="Số bài">
                        <input type="text" id="hs_lessonname" class="text-white fw-bold px-1 flex-grow-1 bg-dark border border-secondary rounded" style="min-width: 40px; height: 28px; outline: none; font-size: 0.8rem;" value="${currentLessonName}" placeholder="Tên bài...">
                        
                        <div class="d-flex align-items-center bg-dark rounded border border-secondary px-1" style="height: 28px;">
                            <!-- NÚT 3 TRẠNG THÁI: ĐƠN -> OR -> AND -->
                            <button id="btn_multi_state" class="btn btn-sm btn-secondary p-0 fw-bold me-1 d-flex align-items-center justify-content-center" style="width: 38px; height: 22px; font-size: 0.6rem;" onclick="window.toggle_multi_state()" data-state="0" title="Chế độ ĐƠN: 1 vùng">ĐƠN</button>
                            <div class="btn-group">
                                <input type="radio" class="btn-check" name="hs_shape" id="shape_circle" value="circle" checked>
                                <label class="btn btn-outline-info btn-sm p-0 d-flex align-items-center justify-content-center border-0" for="shape_circle" style="width: 20px; height: 24px;"><div style="width: 10px; height: 10px; border: 1.5px dashed currentColor; border-radius: 50%;"></div></label>
                                <input type="radio" class="btn-check" name="hs_shape" id="shape_rect" value="rect">
                                <label class="btn btn-outline-info btn-sm p-0 d-flex align-items-center justify-content-center border-0" for="shape_rect" style="width: 20px; height: 24px;"><div style="width: 10px; height: 10px; border: 1.5px dashed currentColor;"></div></label>
                            </div>
                        </div>
                    </div>
                    <button class="btn-close btn-close-white ms-1" style="font-size: 0.7rem;" onclick="document.getElementById('hotspot_creator_modal').remove()"></button>
                </div>

                <!-- 🌟 KHU VỰC NHẬP LIỆU -->
                <div class="p-1 rounded mb-2 shadow-sm d-flex flex-column position-relative" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    
                    <div id="hs_paste_overlay" class="position-absolute top-0 start-0 w-100 h-100 d-none flex-column p-2 bg-dark z-3" style="border-radius: 6px;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <div class="fw-bold text-success small"><i class="bi bi-clipboard-data"></i> Dán dữ liệu AI hàng loạt</div>
                            <button type="button" class="btn-close btn-close-white" style="font-size: 0.6rem;" onclick="document.getElementById('hs_paste_overlay').classList.add('d-none')"></button>
                        </div>
                        <textarea id="hs_paste_textarea" class="form-control flex-grow-1 mb-1 custom-scrollbar" style="font-size: 0.8rem; resize: none; background: rgba(0,0,0,0.5); color: #fff;" placeholder="Dán nội dung AI (CÂU HỎI... GIẢI THÍCH...) vào đây..."></textarea>
                        <button class="btn btn-sm btn-success w-100 fw-bold" onclick="window.process_pasted_hotspots()">Phân tích & Tách câu</button>
                    </div>

                    <div class="d-flex justify-content-end mb-1 gap-1">
                        <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" 
                                onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Bọc từ vựng Magic Vocab" 
                                style="width: 24px; height: 24px; border: 1px solid #f59e0b; color: #fff;"><i class="bi bi-magic" style="font-size: 0.8rem;"></i></button>
                        <button type="button" class="btn btn-sm rounded-circle shadow p-0 d-flex align-items-center justify-content-center" 
                                onclick="window.generate_hotspot_ai()" title="Gọi AI viết 1 câu" 
                                style="width: 24px; height: 24px; background: linear-gradient(135deg, #2563eb, #db2777); border: 1px solid #fff; color: white;"><i class="bi bi-stars" style="font-size: 0.8rem;"></i></button>
                        <button type="button" class="btn btn-sm rounded-circle shadow p-0 d-flex align-items-center justify-content-center" 
                                onclick="document.getElementById('hs_paste_overlay').classList.remove('d-none')" title="Dán dữ liệu AI" 
                                style="width: 24px; height: 24px; background: #10b981; border: 1px solid #fff; color: white;"><i class="bi bi-clipboard-check animate__animated animate__pulse animate__infinite" style="font-size: 0.8rem;"></i></button>
                        
                        <div style="border-left: 1px solid rgba(255,255,255,0.2); margin: 0 2px;"></div>
                        <button type="button" class="btn btn-sm btn-primary rounded-circle shadow p-0 d-flex align-items-center justify-content-center" 
                                onclick="window.add_point_to_pending_list()" title="Thêm câu mới / Chốt tọa độ" 
                                style="width: 24px; height: 24px; background: #3b82f6; border: 1px solid #fff; color: white;"><i class="bi bi-plus-lg" style="font-size: 0.9rem; font-weight: bold;"></i></button>
                    </div>
                    
                    <textarea id="hs_question" class="form-control text-white glass-input-style mb-1 custom-scrollbar" style="font-size: 0.9rem; resize: none; min-height: 55px;" placeholder="Nhập câu lệnh (Thủ công)..."></textarea>
                    <textarea id="hs_hint" class="form-control form-control-sm text-success glass-input-style custom-scrollbar" rows="1" style="font-size: 0.8rem; resize: none;" placeholder="Giải thích (Hint)..."></textarea>
                </div>

                <!-- 🌟 DANH SÁCH CHỜ -->
                <div class="flex-grow-1 p-1 rounded custom-scrollbar d-flex flex-column" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); overflow-y: auto; min-height: 0;">
                    <div id="hs_pending_list_container" class="flex-grow-1">
                        <div class="text-center text-white-50 small mt-4">Danh sách trống...</div>
                    </div>
                </div>

                <div class="d-flex justify-content-center align-items-center pt-2 mt-2 border-top position-relative" style="border-color: rgba(255,255,255,0.1) !important; min-height: 45px; flex-shrink: 0;">
                    <div class="text-warning fw-bold small position-absolute start-0 ms-2" id="hs_total_badge">Tổng: 0</div>
                    <button id="btn_save_all_hotspots" class="btn btn-danger shadow-sm d-flex align-items-center justify-content-center p-0 z-1" style="border-radius: 8px; width: 80px; height: 38px;" onclick="window.submit_all_hotspots()">
                        <i class="bi bi-cloud-arrow-up-fill fs-3"></i>
                    </button>
                </div>

            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// 🌟 MỞ RỘNG ĐỂ SỬA CÂU TRONG DANH SÁCH
window.toggle_edit_hotspot = function(index) {
    let el = document.getElementById('hs_edit_form_' + index);
    if(el) el.classList.toggle('d-none');
};
window.update_hotspot_text = function(index, field, value) {
    window.hs_pending_list[index][field] = value;
};

// 🌟 XỬ LÝ TEXT AI DÁN VÀO
window.process_pasted_hotspots = function() {
    let rawText = document.getElementById('hs_paste_textarea').value;
    let blocks = rawText.split('CÂU HỎI:').filter(b => b.trim() !== '');
    let count = 0;
    let shapeType = document.querySelector('input[name="hs_shape"]:checked').value || 'circle';

    blocks.forEach((block) => {
        let parts = block.split('GIẢI THÍCH:');
        if(parts.length >= 2) {
            let qText = parts[0].trim();
            let explainText = parts[1].split(/Hành động/i)[0].trim(); 
            window.hs_pending_list.push({ q: qText, hint: explainText, coords: "", shape: shapeType });
            count++;
        }
    });
    
    if(count > 0) {
        if(typeof window.show_toast === 'function') window.show_toast(`✅ Đã bóc tách ${count} câu! Bấm vào các thẻ báo đỏ để vẽ.`);
        document.getElementById('hs_paste_overlay').classList.add('d-none');
        document.getElementById('hs_paste_textarea').value = '';
        window.render_pending_list();
    } else {
        if(typeof window.show_toast === 'function') window.show_toast("❌ Không đúng định dạng (CÂU HỎI: ... GIẢI THÍCH: ...)", true);
    }
};

window.reset_multi_mode = function() {
    window.hotspot_multi_array = []; window.hotspot_temp_coords = "";
    let mContainer = document.getElementById('hs_multi_markers'); if(mContainer) mContainer.innerHTML = '';
    let tMarker = document.getElementById('hs_temp_marker'); if(tMarker) tMarker.classList.add('d-none');
    let cText = document.getElementById('hs_coords_text'); if(cText) cText.innerText = "Sẵn sàng vẽ vùng chọn";
};

window.preview_hotspot_image = function(input) {
    if (input.files && input.files[0]) {
        window.load_blob_to_hotspot(input.files[0]);
    }
};

// 🌟 HÀM DÁN ẢNH TỪ CLIPBOARD KHI BẤM NÚT
window.paste_hotspot_image = async function() {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const imageTypes = item.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length > 0) {
                const blob = await item.getType(imageTypes[0]);
                window.load_blob_to_hotspot(blob);
                return;
            }
        }
        if(typeof window.show_toast === 'function') {
            window.show_toast("⚠️ Không tìm thấy ảnh trong bộ nhớ tạm (Clipboard)!", true);
        } else {
            alert("⚠️ Không tìm thấy ảnh trong bộ nhớ tạm (Clipboard).");
        }
    } catch (err) {
        console.error("Lỗi clipboard API: ", err);
        if(typeof window.show_toast === 'function') {
            window.show_toast("⚠️ Vui lòng nhấn phím Ctrl + V (hoặc Cmd + V) để dán!", true);
        } else {
            alert("⚠️ Trình duyệt chưa cấp quyền dán. Vui lòng nhấn Ctrl + V!");
        }
    }
};

// 🌟 BẮT SỰ KIỆN CTRL + V TOÀN CỤC TRONG MODAL
document.addEventListener('paste', function(e) {
    if (!document.getElementById('hotspot_creator_modal')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; 

    let items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            let blob = items[i].getAsFile();
            window.load_blob_to_hotspot(blob);
            e.preventDefault();
            break;
        }
    }
});

// 🌟 HÀM HỖ TRỢ ĐỌC ẢNH CHUNG
window.load_blob_to_hotspot = function(blob) {
    let reader = new FileReader();
    reader.onload = function(event) {
        window.hotspot_temp_base64 = event.target.result;
        window.hotspot_current_image_id = null; 
        window.reset_multi_mode();
        let img = document.getElementById('hs_img_preview');
        img.src = event.target.result;
        document.getElementById('hs_img_container').style.display = 'inline-block';
        document.getElementById('hs_empty_state').style.display = 'none';
        document.getElementById('hs_coords_display').style.display = 'block';
    };
    reader.readAsDataURL(blob);
};

window.start_draw_hotspot = function(e) {
    let img = document.getElementById('hs_img_preview');
    if(!img.src) return;
    window.hs_is_drawing = true;
    let rect = img.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    window.hs_start_x = ((clientX - rect.left) / rect.width) * 100;
    window.hs_start_y = ((clientY - rect.top) / rect.height) * 100;
    let marker = document.getElementById('hs_temp_marker');
    marker.classList.remove('d-none');
    let shape = document.querySelector('input[name="hs_shape"]:checked').value;
    if (shape === 'circle') {
        marker.classList.add('translate-middle'); marker.style.borderRadius = '50%';
        marker.style.left = window.hs_start_x + '%'; marker.style.top = window.hs_start_y + '%';
        marker.style.width = '0%'; marker.style.height = '0%';
    } else {
        marker.classList.remove('translate-middle'); marker.style.borderRadius = '4px';
        marker.style.left = window.hs_start_x + '%'; marker.style.top = window.hs_start_y + '%';
        marker.style.width = '0%'; marker.style.height = '0%';
    }
};

window.draw_hotspot = function(e) {
    if (!window.hs_is_drawing) return;
    e.preventDefault(); 
    let img = document.getElementById('hs_img_preview');
    let rect = img.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let currentX = ((clientX - rect.left) / rect.width) * 100;
    let currentY = ((clientY - rect.top) / rect.height) * 100;
    let marker = document.getElementById('hs_temp_marker');
    let shape = document.querySelector('input[name="hs_shape"]:checked').value;
    
    if (shape === 'circle') {
        let dx = currentX - window.hs_start_x; let dy = currentY - window.hs_start_y;
        let radius = Math.sqrt(dx*dx + dy*dy);
        marker.style.width = (radius * 2) + '%'; marker.style.height = (radius * 2) + '%';
        window.hotspot_temp_coords = `circle:${window.hs_start_x.toFixed(2)},${window.hs_start_y.toFixed(2)},${radius.toFixed(2)}`;
    } else {
        let left = Math.min(window.hs_start_x, currentX); let top = Math.min(window.hs_start_y, currentY);
        let width = Math.abs(currentX - window.hs_start_x); let height = Math.abs(currentY - window.hs_start_y);
        marker.style.left = left + '%'; marker.style.top = top + '%';
        marker.style.width = width + '%'; marker.style.height = height + '%';
        window.hotspot_temp_coords = `rect:${left.toFixed(2)},${top.toFixed(2)},${width.toFixed(2)},${height.toFixed(2)}`;
    }
};

// 🌟 HÀM MỚI: ĐẢO 3 TRẠNG THÁI CỦA NÚT BẤM (ĐƠN -> OR -> AND)
window.toggle_multi_state = function() {
    let btn = document.getElementById('btn_multi_state');
    if (!btn) return;
    let state = parseInt(btn.getAttribute('data-state')) || 0;
    state = (state + 1) % 3; // Lặp vòng 0 -> 1 -> 2 -> 0
    btn.setAttribute('data-state', state);
    
    if(state === 0) {
        btn.className = "btn btn-sm btn-secondary p-0 fw-bold me-1 d-flex align-items-center justify-content-center";
        btn.innerText = "ĐƠN"; btn.title = "ĐƠN: Chọn 1 vùng";
    } else if (state === 1) {
        btn.className = "btn btn-sm btn-success p-0 fw-bold me-1 d-flex align-items-center justify-content-center";
        btn.innerText = "OR"; btn.title = "MULTI (OR): Học sinh chọn 1 vùng bất kỳ là ĐÚNG";
    } else if (state === 2) {
        btn.className = "btn btn-sm btn-warning text-dark p-0 fw-bold me-1 d-flex align-items-center justify-content-center";
        btn.innerText = "AND"; btn.title = "MULTI (AND): Học sinh phải chọn ĐỦ tất cả các vùng";
    }
    window.reset_multi_mode();
};

window.end_draw_hotspot = function(e) {
    if (!window.hs_is_drawing) return;
    window.hs_is_drawing = false;
    let shape = document.querySelector('input[name="hs_shape"]:checked').value;
    let marker = document.getElementById('hs_temp_marker');
    let finalCoord = "";
    
    if (shape === 'circle') {
        let parts = window.hotspot_temp_coords.replace('circle:','').split(',');
        if (!parts[2] || parseFloat(parts[2]) < 1) { 
            finalCoord = `circle:${window.hs_start_x.toFixed(2)},${window.hs_start_y.toFixed(2)},5.00`;
            marker.style.width = '10%'; marker.style.height = '10%';
        } else { finalCoord = window.hotspot_temp_coords; }
    } else {
        let parts = window.hotspot_temp_coords.replace('rect:','').split(',');
        if (!parts[2] || parseFloat(parts[2]) < 1 || parseFloat(parts[3]) < 1) { 
            let l = window.hs_start_x - 5, t = window.hs_start_y - 5; 
            marker.style.left = l + '%'; marker.style.top = t + '%';
            marker.style.width = '10%'; marker.style.height = '10%';
            finalCoord = `rect:${l.toFixed(2)},${t.toFixed(2)},10.00,10.00`;
        } else { finalCoord = window.hotspot_temp_coords; }
    }

    // 🌟 ĐỌC TRẠNG THÁI TỪ NÚT BẤM (THAY VÌ ĐỌC TỪ CHECKBOX CŨ)
    let btnMulti = document.getElementById('btn_multi_state');
    let multiState = btnMulti ? parseInt(btnMulti.getAttribute('data-state')) || 0 : 0;
    let isMulti = multiState > 0;
    
    if (isMulti) {
        window.hotspot_multi_array.push(finalCoord);
        // Gắn cờ |AND| vào cuối chuỗi tọa độ nếu đang ở trạng thái màu VÀNG
        window.hotspot_temp_coords = window.hotspot_multi_array.join('|') + (multiState === 2 ? '|AND|' : '');
        
        let clone = marker.cloneNode(true);
        clone.id = ""; clone.style.border = "2px solid #eab308"; clone.style.background = "rgba(234, 179, 8, 0.2)";
        document.getElementById('hs_multi_markers').appendChild(clone);
        marker.classList.add('d-none');
        document.getElementById('hs_coords_text').innerHTML = `Đã ghim <b>${window.hotspot_multi_array.length}</b> vùng. Bấm nút Thêm (+) để chốt.`;
    } else {
        window.hotspot_temp_coords = finalCoord;
        document.getElementById('hs_coords_text').innerText = `Đã chọn 1 vùng`;

        if (window.hs_active_index !== null && window.hs_active_index !== undefined) {
            window.hs_pending_list[window.hs_active_index].coords = finalCoord;
            let currentNum = window.hs_active_index + 1;
            window.hs_active_index = null; 
            marker.classList.add('d-none'); 
            window.render_pending_list();
            if(typeof window.show_toast === 'function') window.show_toast(`✅ Đã chốt vùng cho câu số ${currentNum}!`);
        }
    }
};

window.generate_hotspot_ai = function() {
    let qInput = document.getElementById('hs_question'); let hintInput = document.getElementById('hs_hint');
    let keyword = qInput.value.trim();
    if (!keyword) return window.show_toast("⚠️ Hãy gõ từ khóa vào ô câu hỏi rồi bấm AI!", true);
    qInput.value = "⏳ AI đang phân tích...";
    google.script.run
    .withSuccessHandler(function(res) {
        if(res.success) { qInput.value = res.q; hintInput.value = res.hint; window.show_toast("🪄 Đã sinh câu hỏi thành công!"); } 
        else { qInput.value = keyword; window.show_toast("❌ Lỗi AI: " + res.msg, true); }
    })
    .withFailureHandler(function(err) { qInput.value = keyword; window.show_toast("❌ Lỗi mạng: " + err, true); })
    .generateHotspotAI(keyword);
};

// 🌟 THỦ CÔNG HOẶC CHỐT MULTI
window.add_point_to_pending_list = function() {
    if (!window.hotspot_temp_base64) return window.show_toast("⚠️ Thầy chưa tải hình ảnh lên!", true);
    if (!window.hotspot_temp_coords) return window.show_toast("⚠️ Thầy chưa vẽ vùng chọn trên ảnh!", true);
    
    let shapeType = document.querySelector('input[name="hs_shape"]:checked').value;

    if (window.hs_active_index !== null && window.hs_active_index !== undefined) {
        window.hs_pending_list[window.hs_active_index].coords = window.hotspot_temp_coords;
        let currentNum = window.hs_active_index + 1;
        window.hs_active_index = null; 
        if(typeof window.show_toast === 'function') window.show_toast(`✅ Đã chốt tọa độ MULTI cho câu số ${currentNum}!`);
    } else {
        let qText = document.getElementById('hs_question').value.trim();
        let hint = document.getElementById('hs_hint').value.trim();
        if (!qText) return window.show_toast("⚠️ Vui lòng nhập nội dung câu hỏi!", true);
        
        window.hs_pending_list.push({ q: qText, hint: hint, coords: window.hotspot_temp_coords, shape: shapeType });
        if(typeof window.show_toast === 'function') window.show_toast("✅ Đã chốt 1 câu.");
    }

    document.getElementById('hs_question').value = ""; document.getElementById('hs_hint').value = "";
    window.reset_multi_mode(); 
    
    // 🌟 RESET NÚT MULTI VỀ TRẠNG THÁI MỜ SAU KHI LƯU XONG
    let btnState = document.getElementById('btn_multi_state');
    if(btnState) {
        btnState.setAttribute('data-state', '0');
        btnState.className = "btn btn-sm btn-secondary p-0 fw-bold me-1 d-flex align-items-center justify-content-center";
        btnState.innerText = "ĐƠN";
    }
    
    window.render_pending_list();
};

window.remove_point_from_list = function(index) {
    if(window.hs_active_index === index) window.hs_active_index = null;
    window.hs_pending_list.splice(index, 1);
    window.render_pending_list();
};

window.set_active_hotspot_task = function(index) {
    if (!window.hotspot_temp_base64) return window.show_toast("⚠️ Hãy tải hình ảnh lên trước!", true);
    window.hs_active_index = index;
    window.render_pending_list();
    document.getElementById('hs_coords_text').innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-cursor-fill"></i> Đang gán tọa độ cho câu số ${index + 1}. Kéo chuột trên ảnh để vẽ!</span>`;
};

window.render_pending_list = function() {
    let container = document.getElementById('hs_pending_list_container');
    let markersContainer = document.getElementById('hs_saved_markers');
    document.getElementById('hs_total_badge').innerText = `Tổng: ${window.hs_pending_list.length}`;

    if (window.hs_pending_list.length === 0) {
        container.innerHTML = `<div class="text-center text-white-50 small mt-4">Danh sách trống...</div>`;
        markersContainer.innerHTML = ''; return;
    }

    let html = ''; let markersHtml = '';
    window.hs_pending_list.forEach((item, index) => {
        let num = index + 1;
        let isMissingCoords = !item.coords || item.coords === "";
        let isActive = window.hs_active_index === index;
        
        let bgClass = isActive ? "bg-warning text-dark" : "bg-dark text-white";
        let borderClass = isActive ? "border-warning" : "border-secondary";
        
        let statusBadge = isMissingCoords 
            ? `<span class="badge bg-danger ms-1 animate__animated animate__flash animate__infinite" style="font-size:0.65rem; cursor:pointer;" onclick="window.set_active_hotspot_task(${index})">Cần vẽ</span>` 
            : `<span class="badge bg-success ms-1" style="font-size:0.65rem; cursor:pointer;" onclick="window.set_active_hotspot_task(${index})" title="Nhấp để vẽ lại tọa độ mới"><i class="bi bi-arrow-repeat"></i> Vẽ lại</span>`;

        html += `
        <div class="p-1 px-2 mb-1 rounded ${bgClass} border ${borderClass} shadow-sm" style="transition: all 0.2s;">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center flex-grow-1 overflow-hidden" style="${isMissingCoords ? 'cursor:pointer;' : ''}" onclick="${isMissingCoords && !isActive ? `window.set_active_hotspot_task(${index})` : ''}">
                    <span class="badge ${isActive ? 'bg-dark text-warning' : 'bg-info text-dark'} rounded-circle me-2 d-flex align-items-center justify-content-center p-0" style="width: 20px; height: 20px; font-size: 0.7rem;">${num}</span>
                    <div class="small text-truncate" style="font-size: 0.8rem; max-width: 130px;" title="${item.q}">${item.q}</div>
                    ${statusBadge}
                </div>
                
                <div class="d-flex gap-1 align-items-center">
                    <button class="btn btn-sm ${isActive ? 'text-dark' : 'text-info'} p-0 border-0 bg-transparent" onclick="window.toggle_edit_hotspot(${index})" title="Sửa nội dung chữ"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm ${isActive ? 'text-dark' : 'text-danger'} p-0 border-0 bg-transparent" onclick="window.remove_point_from_list(${index})" title="Xóa"><i class="bi bi-x-circle-fill"></i></button>
                </div>
            </div>
            
            <div id="hs_edit_form_${index}" class="d-none mt-2 p-2 rounded" style="background: rgba(0,0,0,0.2); border: 1px dashed rgba(255,255,255,0.2);">
                <textarea class="form-control form-control-sm mb-1 custom-scrollbar text-white border-secondary" style="background: rgba(0,0,0,0.4); font-size: 0.8rem;" rows="2" oninput="window.update_hotspot_text(${index}, 'q', this.value)" placeholder="Sửa câu hỏi...">${item.q}</textarea>
                <textarea class="form-control form-control-sm custom-scrollbar text-success border-secondary" style="background: rgba(0,0,0,0.4); font-size: 0.75rem;" rows="1" oninput="window.update_hotspot_text(${index}, 'hint', this.value)" placeholder="Sửa giải thích...">${item.hint}</textarea>
            </div>
        </div>`;

        if (!isMissingCoords) {
            let ansArray = item.coords.split('|');
            ansArray.forEach(singleAns => {
                if (singleAns.startsWith('rect:')) {
                    let parts = singleAns.replace('rect:','').split(',');
                    markersHtml += `<div class="position-absolute d-flex align-items-center justify-content-center shadow" 
                     style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]}%; height: ${parts[3]}%; border: 1.5px solid #38bdf8; border-radius: 4px; background: rgba(14,165,233,0.15); color: #38bdf8; font-size: 0.85rem; font-weight: bold; pointer-events: none; z-index: 5;">${num}</div>`;
                } else {
                    let parts = singleAns.replace('circle:','').split(',');
                    markersHtml += `<div class="position-absolute translate-middle d-flex align-items-center justify-content-center shadow" 
                     style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]*2}%; height: ${parts[2]*2}%; border: 1.5px solid #38bdf8; border-radius: 50%; background: rgba(14,165,233,0.15); color: #38bdf8; font-size: 0.85rem; font-weight: bold; pointer-events: none; z-index: 5;">${num}</div>`;
                }
            });
        }
    });
    container.innerHTML = html; markersContainer.innerHTML = markersHtml;
};

window.submit_all_hotspots = async function() {
    if (window.hs_pending_list.length === 0) return window.show_toast("⚠️ Danh sách chờ đang trống!", true);
    
    let missingCoords = window.hs_pending_list.filter(item => !item.coords || item.coords === "");
    if (missingCoords.length > 0) return window.show_toast(`⚠️ Còn ${missingCoords.length} câu chưa được vẽ tọa độ (Thẻ báo đỏ)!`, true);

    let lesson = document.getElementById('hs_lesson').value.trim();
    let lessonname = document.getElementById('hs_lessonname').value.trim();
    let btn = document.getElementById('btn_save_all_hotspots');

    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
    btn.classList.add('disabled');

    let finalizeSaveBatch = async function(imageUrl) {
        let payloadArray = window.hs_pending_list.map(item => ({
            subject_key: window.current_subject || window.temp_subject_key || 'tienganh',
            lesson: lesson, type: "hotspot", level: 2, q: item.q,
            opta: "", optb: "", optc: "", optd: "", a: item.coords, answer: item.coords,
            hint: item.hint, lessonname: lessonname, image: imageUrl, original_q: item.q
        }));

        try {
            const { error } = await db.from('questions').insert(payloadArray);
            if (error) throw error;
            window.show_toast(`🎉 Đã lưu thành công ${payloadArray.length} câu lên Supabase!`);
            document.getElementById('hotspot_creator_modal').remove();
            if (typeof render_admin_panel === 'function') render_admin_panel();
        } catch (err) {
            window.show_toast("❌ Lỗi lưu dữ liệu: " + err.message, true);
            btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill fs-3"></i>`;
            btn.classList.remove('disabled');
        }
    };

    if (!window.hotspot_current_image_id) {
        try {
            // Chuyển Base64 thành File để đẩy lên Supabase Storage (Bucket tên là 'media')
            let res = await fetch(window.hotspot_temp_base64);
            let blob = await res.blob();
            let fileName = `hotspot_${Date.now()}.png`;
            
            const { data, error } = await db.storage.from('media').upload(fileName, blob);
            if (error) throw error;
            
            // Lấy link ảnh Public
            let publicUrl = db.storage.from('media').getPublicUrl(fileName).data.publicUrl;
            window.hotspot_current_image_id = publicUrl;
            finalizeSaveBatch(publicUrl);
        } catch (err) {
            window.show_toast("❌ Lỗi tải ảnh lên Supabase: " + err.message, true);
            btn.classList.remove('disabled'); btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill fs-3"></i>`;
        }
    } else { finalizeSaveBatch(window.hotspot_current_image_id); }
};