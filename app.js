import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iddadoxyxtgutjhaxloc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZGFkb3h5eHRndXRqaGF4bG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjI3NzgsImV4cCI6MjA4NTIzODc3OH0.7Hdzr0byvX-BXGsQkDpV46fzjXs7wSa2Fv4lz4GcGDA",
);

let currentProfile = null,
  selectedDevice = null,
  allDevices = [],
  allUsers = [];

const toast = (m, s = false) => alert(`${s ? "✅" : "❌"} ${m}`);
const toSafe = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();

// --- TỰ ĐỘNG SINH Ô TẢI ẢNH ---
function updateStepBoxes(inputId, containerId, prefix) {
  const text = document.getElementById(inputId).value;
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const container = document.getElementById(containerId);
  const currentCount = container.querySelectorAll(".step-up-box").length;

  if (lines.length === 0) {
    container.innerHTML =
      '<p style="font-size:12px; color:var(--text-muted); font-style:italic;">* Hãy gõ quy trình vận hành ở ô bên trên để tự tạo ô tải ảnh.</p>';
    return;
  }
  if (container.querySelector("p")) container.innerHTML = "";

  if (lines.length > currentCount) {
    for (let i = currentCount + 1; i <= lines.length; i++) {
      const d = document.createElement("div");
      d.className = "step-up-box";
      d.innerHTML = `<label style="font-size:11px; font-weight:800; color:var(--p);">📸 ẢNH BƯỚC ${i}</label>
                           <input type="file" id="${prefix}_${i}" accept="image/*" style="padding:8px; margin:4px 0 10px;"/>`;
      container.appendChild(d);
    }
  } else if (lines.length < currentCount) {
    for (let i = currentCount; i > lines.length; i--)
      container.lastChild.remove();
  }
}
document.getElementById("addSteps").oninput = () =>
  updateStepBoxes("addSteps", "dynamicAddSteps", "addStepImg");
document.getElementById("insStepsInput").oninput = () =>
  updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg");

// --- KHỞI TẠO (BẢN CHỐNG LỖI CRASH KHI PROFILE BỊ NULL) ---
async function initApp() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    try {
      let { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // HỆ THỐNG TỰ ĐỘNG VÁ LỖI NẾU TÀI KHOẢN BỊ THIẾU PROFILE
      if (!p || error) {
        p = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || "Thành viên",
          role: session.user.user_metadata?.role || "student",
        };
        await supabase.from("profiles").upsert([p]);
      }

      currentProfile = p;

      // Cập nhật giao diện an toàn
      const safeName = p.full_name || "Khách";
      document.getElementById("userAvatarHeader").innerText = safeName
        .trim()
        .charAt(0)
        .toUpperCase();
      document.getElementById("userShortLabel").innerText = safeName
        .split(" ")
        .pop();
      document.getElementById("userNameFull").innerText = safeName;
      document.getElementById("userRoleBadge").innerText = p.role;

      if (p.role !== "student")
        document.getElementById("btnShowAddModal").classList.remove("hidden");
      if (p.role === "admin")
        document.getElementById("tabAdminUsers").classList.remove("hidden");

      nav("systemView");
      render("analyze");
    } catch (err) {
      console.error("Lỗi khi tải tài khoản:", err);
      await supabase.auth.signOut();
      toast("Sự cố dữ liệu tài khoản, vui lòng đăng nhập lại!");
    }
  } else {
    nav("loginView");
  }
}
initApp();

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    document.getElementById("changePassModal").classList.remove("hidden");
  }
});

// --- RENDER THIẾT BỊ LÊN LƯỚI ---
async function render(cat) {
  document.getElementById("deviceGrid").innerHTML =
    "<p style='text-align:center; width:100%; grid-column:1/-1; padding:40px;'>Đang tải dữ liệu lab...</p>";
  const { data } = await supabase.from("devices").select("*").eq("cat", cat);
  allDevices = data || [];
  displayDevices(allDevices);
}

function displayDevices(list) {
  const grid = document.getElementById("deviceGrid");
  grid.innerHTML = list.length
    ? ""
    : "<p style='grid-column:1/-1; text-align:center; color: var(--text-muted); padding:40px;'>Chưa có thiết bị nào trong nhóm này.</p>";

  list.forEach((d) => {
    const safe = toSafe(d.name);
    const img = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;
    const stText =
      d.status === "normal"
        ? "🟢 Tốt"
        : d.status === "maintenance"
          ? "🟡 Bảo trì"
          : "🔴 Hỏng";

    const div = document.createElement("div");
    div.className = "device-card";
    div.onclick = () => openModal(d);

    div.innerHTML = `
          <img src="${img}" class="device-card-img" />
          <div class="device-card-body">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <span style="background: var(--p-light); color: var(--p); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 800;">⚙️</span>
              <span class="tag" style="background: #f8fafc; color: #475569;">${stText}</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 18px;">${d.name}</h3>
            <p style="margin: 0 0 20px; font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${d.description || "Chưa cập nhật mô tả..."}</p>
            <div class="hust-card-footer"><span>Xem kỹ thuật</span><span>➔</span></div>
          </div>`;
    grid.appendChild(div);
  });
}

window.filterDevices = () => {
  const term = document.getElementById("searchDevice").value.toLowerCase();
  displayDevices(allDevices.filter((d) => d.name.toLowerCase().includes(term)));
};

// --- LOGIC CHUYỂN TAB TRONG MODAL CHI TIẾT ---
window.switchModalTab = (tabId) => {
  document.getElementById("btnTabInfo").classList.remove("active");
  document.getElementById("btnTabLog").classList.remove("active");
  document.getElementById("mTabInfo").classList.add("hidden");
  document.getElementById("mTabLog").classList.add("hidden");

  if (tabId === "info") {
    document.getElementById("btnTabInfo").classList.add("active");
    document.getElementById("mTabInfo").classList.remove("hidden");
  } else {
    document.getElementById("btnTabLog").classList.add("active");
    document.getElementById("mTabLog").classList.remove("hidden");
    loadLogs();
    document.getElementById("logDate").valueAsDate = new Date();
  }
};

window.openModal = (d) => {
  selectedDevice = d;
  document.getElementById("mTitle").innerText = d.name;
  document.getElementById("mDesc").innerText =
    d.description || "Đang cập nhật...";
  document.getElementById("mSteps").innerText = d.steps || "Đang cập nhật...";

  const safe = toSafe(d.name);
  document.getElementById("mImage").src =
    `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;

  const gallery = document.getElementById("mStepGallery");
  gallery.innerHTML = "";
  for (let i = 1; i <= 8; i++) {
    const img = document.createElement("img");
    img.src = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}/step_${i}.jpg?t=${Date.now()}`;
    img.onerror = () => img.remove();
    img.onclick = () => window.open(img.src);
    gallery.appendChild(img);
  }

  const canEdit = currentProfile.role !== "student";
  document.getElementById("btnToggleEdit").classList.toggle("hidden", !canEdit);
  document
    .getElementById("btnDeleteDevice")
    .classList.toggle("hidden", !canEdit);

  if (canEdit) {
    document.getElementById("insInput").value = d.description || "";
    document.getElementById("insStepsInput").value = d.steps || "";
    document.getElementById("insStatus").value = d.status || "normal";
    updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg");
  }

  switchModalTab("info");
  document.getElementById("detailModal").classList.remove("hidden");
};
window.closeModal = () => {
  document.getElementById("detailModal").classList.add("hidden");
  document.getElementById("insZone").classList.add("hidden");
};

// --- LOGIC TẢI VÀ GHI NHẬT KÝ SỬ DỤNG ---
window.loadLogs = async () => {
  const container = document.getElementById("logListContainer");
  container.innerHTML =
    "<p style='text-align:center; color:var(--text-muted);'>Đang tải dữ liệu sổ tay...</p>";

  const { data, error } = await supabase
    .from("device_logs")
    .select("*")
    .eq("device_id", selectedDevice.id)
    .order("usage_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error || !data || !data.length) {
    container.innerHTML =
      "<div style='text-align:center; padding: 20px; color:var(--text-muted); background: #f8fafc; border-radius: 8px;'>Chưa có ai ghi danh sử dụng máy này.</div>";
    return;
  }

  container.innerHTML = "";
  data.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-item";

    let dateStr = "N/A";
    if (log.usage_date) {
      dateStr = new Date(log.usage_date).toLocaleDateString("vi-VN");
    }
    const timeStr = `${log.start_time ? log.start_time.substring(0, 5) : "??"} - ${log.end_time ? log.end_time.substring(0, 5) : "??"}`;

    div.innerHTML = `
            <div class="log-item-header">
                <span class="log-user">👤 ${log.user_name || "Khách"}</span>
                <span>🕒 ${dateStr} | ${timeStr}</span>
            </div>
            <div style="font-size: 14px; color: var(--text-main);"><b>Mục đích:</b> ${log.purpose || "Không ghi chú"}</div>
        `;
    container.appendChild(div);
  });
};

document.getElementById("btnSubmitLog").onclick = async () => {
  if (!currentProfile)
    return toast("Lỗi: Không tìm thấy thông tin tài khoản của bạn!");

  const date = document.getElementById("logDate").value;
  const start = document.getElementById("logStart").value;
  const end = document.getElementById("logEnd").value;
  const purpose = document.getElementById("logPurpose").value;

  if (!date || !start || !end || !purpose) {
    return toast("Vui lòng điền đầy đủ ngày, giờ và mục đích sử dụng!");
  }

  const btn = document.getElementById("btnSubmitLog");
  btn.disabled = true;
  btn.innerText = "ĐANG LƯU...";

  const { error } = await supabase.from("device_logs").insert([
    {
      device_id: selectedDevice.id,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      usage_date: date,
      start_time: start,
      end_time: end,
      purpose: purpose,
    },
  ]);

  btn.disabled = false;
  btn.innerText = "GHI VÀO SỔ TAY LAB";

  if (error) {
    toast("Lỗi khi ghi nhật ký: " + error.message);
  } else {
    toast("Đã ghi nhật ký thành công!", true);
    document.getElementById("logPurpose").value = "";
    loadLogs();
  }
};

// --- CẨM NANG SOP ---
document.getElementById("btnViewSOP").onclick = () => {
  const content = document.getElementById("sopContent");
  content.innerHTML = "";
  document.getElementById("sopModal").classList.remove("hidden");

  if (!selectedDevice || !selectedDevice.steps) {
    content.innerHTML =
      "<div style='text-align:center; padding: 50px 20px; color: var(--text-muted); font-size: 16px;'><i>🛠️ Thiết bị này chưa được cập nhật hướng dẫn vận hành.</i></div>";
    return;
  }

  const lines = selectedDevice.steps.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    content.innerHTML =
      "<div style='text-align:center; padding: 50px 20px; color: var(--text-muted); font-size: 16px;'><i>🛠️ Thiết bị này chưa được cập nhật hướng dẫn vận hành.</i></div>";
    return;
  }

  const safeName = toSafe(selectedDevice.name);

  lines.forEach((t, i) => {
    const step = i + 1;
    const div = document.createElement("div");
    div.className = "sop-step";
    div.innerHTML = `
            <div class="sop-step-num">${step}</div>
            <div style="flex:1;">
                <b style="font-size: 16px; color: var(--text-main);">Bước ${step}</b>
                <p style="margin-top: 8px; line-height: 1.6;">${t}</p>
            </div>
            <img src="https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safeName}/step_${step}.jpg?t=${Date.now()}" class="sop-step-img" onerror="this.style.display='none'"/>
        `;
    content.appendChild(div);
  });
};

// --- ADMIN USERS ---
window.loadAdminUsers = async () => {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  allUsers = data || [];
  document.getElementById("statTotal").innerText = allUsers.length;
  document.getElementById("statInstructor").innerText = allUsers.filter(
    (u) => u.role === "instructor",
  ).length;
  document.getElementById("statAdmin").innerText = allUsers.filter(
    (u) => u.role === "admin",
  ).length;
  window.filterUsers();
};
window.filterUsers = () => {
  const s = document.getElementById("searchUser").value.toLowerCase(),
    r = document.getElementById("filterRole").value;
  const filtered = allUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(s) && (r === "all" || u.role === r),
  );
  const container = document.getElementById("adminUserList");
  container.innerHTML = "";
  filtered.forEach((u) => {
    const isMe = u.id === currentProfile.id;
    const div = document.createElement("div");
    div.className = "user-card";
    div.innerHTML = `<div class="user-card-header"><div class="user-avatar">${u.full_name.trim().charAt(0).toUpperCase()}</div><div style="flex:1;"><b>${u.full_name}</b><br/><small style="color:var(--text-muted);">${u.id.substring(0, 8)}</small></div></div>
                         <div class="user-card-actions" style="border-top: 1px dashed var(--border-color); padding-top: 15px; display: flex; gap: 10px;">
                           <select onchange="updateRole('${u.id}', this.value)" ${isMe ? "disabled" : ""} style="margin:0;"><option value="student" ${u.role === "student" ? "selected" : ""}>Sinh viên</option><option value="instructor" ${u.role === "instructor" ? "selected" : ""}>Phụ trách</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option></select>
                           <button class="btn" style="background:white; color:var(--a); border:1px solid var(--a); padding: 12px;" onclick="deleteUser('${u.id}')" ${isMe ? "disabled" : ""}>🗑️</button>
                         </div>`;
    container.appendChild(div);
  });
};
window.updateRole = async (uid, r) => {
  await supabase.from("profiles").update({ role: r }).eq("id", uid);
  toast("Đã cập nhật vai trò", true);
};

// --- CRUD THIẾT BỊ ---
async function uploadFiles(namePrefix, textLines, filePrefix) {
  for (let i = 1; i <= textLines; i++) {
    const f = document.getElementById(`${filePrefix}_${i}`)?.files[0];
    if (f)
      await supabase.storage
        .from("device-photos")
        .upload(`${namePrefix}/step_${i}.jpg`, f, { upsert: true });
  }
}

document.getElementById("btnSubmitAdd").onclick = async () => {
  const name = document.getElementById("addName").value,
    cat = document.getElementById("addCat").value,
    steps = document.getElementById("addSteps").value;
  if (!name) return toast("Thiếu tên thiết bị!");
  document.getElementById("btnSubmitAdd").disabled = true;
  document.getElementById("btnSubmitAdd").innerText = "Đang đẩy dữ liệu...";

  await supabase.from("devices").insert([
    {
      name,
      cat,
      status: "normal",
      description: document.getElementById("addDesc").value,
      steps,
      created_by: currentProfile.id,
    },
  ]);
  const mainF = document.getElementById("addImgFile").files[0];
  if (mainF)
    await supabase.storage
      .from("device-photos")
      .upload(`${toSafe(name)}.jpg`, mainF, { upsert: true });

  await uploadFiles(
    toSafe(name),
    steps.split("\n").filter((l) => l.trim() !== "").length,
    "addStepImg",
  );
  alert("Thêm thành công!");
  location.reload();
};

document.getElementById("btnSaveUpdate").onclick = async () => {
  const newDesc = document.getElementById("insInput").value,
    newSteps = document.getElementById("insStepsInput").value,
    newStatus = document.getElementById("insStatus").value;
  document.getElementById("btnSaveUpdate").disabled = true;
  document.getElementById("btnSaveUpdate").innerText = "Đang lưu...";

  await supabase
    .from("devices")
    .update({ description: newDesc, steps: newSteps, status: newStatus })
    .eq("id", selectedDevice.id);
  const mainF = document.getElementById("updateImgFile").files[0];
  if (mainF)
    await supabase.storage
      .from("device-photos")
      .upload(`${toSafe(selectedDevice.name)}.jpg`, mainF, { upsert: true });

  await uploadFiles(
    toSafe(selectedDevice.name),
    newSteps.split("\n").filter((l) => l.trim() !== "").length,
    "editStepImg",
  );
  alert("Đã cập nhật!");
  location.reload();
};

document.getElementById("btnDeleteDevice").onclick = async () => {
  if (!confirm("Cảnh báo: Không thể hoàn tác việc xóa máy! Bạn chắc chứ?"))
    return;
  await supabase.from("devices").delete().eq("id", selectedDevice.id);
  location.reload();
};

// --- AUTH & LOGIN/SIGNUP (BẢN VÁ LỖI CẬP NHẬT PROFILE) ---
document.getElementById("btnSignIn").onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: lEmail.value,
    password: lPass.value,
  });
  if (error) toast("Tài khoản hoặc mật khẩu chưa đúng");
  else initApp();
};

document.getElementById("btnSignUp").onclick = async () => {
  const role = rRole.value,
    code = rSecurityCode.value;
  if (role !== "student" && code !== "SEP2026")
    return toast("Mã bảo mật Lab không đúng!");

  document.getElementById("btnSignUp").innerText = "ĐANG XỬ LÝ...";

  const { data, error } = await supabase.auth.signUp({
    email: rEmail.value,
    password: rPass.value,
    options: { data: { full_name: rName.value, role: role } },
  });

  document.getElementById("btnSignUp").innerText = "ĐĂNG KÝ NGAY";

  if (error) {
    toast(error.message);
  } else {
    // Ép hệ thống chèn thông tin vào bảng profiles ngay lúc đăng ký
    if (data?.user) {
      await supabase.from("profiles").upsert([
        {
          id: data.user.id,
          full_name: rName.value,
          role: role,
        },
      ]);
    }
    alert("Đăng ký thành công! Vui lòng Đăng nhập.");
    nav("loginView");
  }
};

document.getElementById("btnLogOut").onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

document.getElementById("btnReset").onclick = async () => {
  await supabase.auth.resetPasswordForEmail(
    document.getElementById("fEmail").value,
    { redirectTo: window.location.origin + window.location.pathname },
  );
  toast("Link đổi mật khẩu đã gửi vào email!", true);
};

document.getElementById("btnSubmitSysPass").onclick = async () => {
  if (
    document.getElementById("sysNewPass").value !==
    document.getElementById("sysConfirmPass").value
  )
    return toast("Mật khẩu gõ lại không khớp");
  await supabase.auth.updateUser({
    password: document.getElementById("sysNewPass").value,
  });
  toast("Mật khẩu đã được đổi!", true);
  location.reload();
};

// --- UI NAVIGATION ---
document.getElementById("rRole").onchange = (e) =>
  document
    .getElementById("securityCodeWrapper")
    .classList.toggle("hidden", e.target.value === "student");
document.getElementById("userTrigger").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.toggle("show");
};
window.onclick = () => {
  document.getElementById("userDropdown").classList.remove("show");
};
document.getElementById("btnToggleEdit").onclick = () =>
  document.getElementById("insZone").classList.toggle("hidden");

document.querySelectorAll(".tab-btn").forEach((b) => {
  b.onclick = () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    if (b.dataset.cat === "users") {
      document.getElementById("deviceGrid").classList.add("hidden");
      document.getElementById("usersGrid").classList.remove("hidden");
      loadAdminUsers();
    } else {
      document.getElementById("usersGrid").classList.add("hidden");
      document.getElementById("deviceGrid").classList.remove("hidden");
      render(b.dataset.cat);
    }
  };
});

window.nav = (id) => {
  ["loginView", "regView", "forgotView", "systemView"].forEach((v) =>
    document.getElementById(v).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
};
