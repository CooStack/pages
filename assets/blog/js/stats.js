// B站数据：头像 + 粉丝数（定时刷新；变化时数字“轮转”）
// 注意：浏览器直连 api.bilibili.com 会被 CORS 拦截，本项目通过本地 server.js 代理：/api/bili/*

(() => {
  const VMID = 291397844;

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  // --- Odometer (滚轮数字) ---
  // 只在数值变化时触发：每位 0-9 垂直堆叠，translateY 实现轮转
  function buildDigitColumn() {
    const col = document.createElement("span");
    col.className = "od-col";
    for (let i = 0; i <= 9; i++) {
      const d = document.createElement("span");
      d.className = "od-digit";
      d.textContent = String(i);
      col.appendChild(d);
    }
    return col;
  }

  function setOdometer(el, value, animate = true) {
    const str = String(value);
    const prev = el.getAttribute("data-value") || "";
    if (prev === str) return;

    el.setAttribute("data-value", str);

    // rebuild columns if length changed
    const oldLen = Number(el.getAttribute("data-len") || "0");
    if (oldLen !== str.length) {
      el.innerHTML = "";
      for (let i = 0; i < str.length; i++) el.appendChild(buildDigitColumn());
      el.setAttribute("data-len", String(str.length));
    }

    const cols = Array.from(el.querySelectorAll(".od-col"));
    cols.forEach((col, i) => {
      const digit = Number(str[i] || "0");
      col.style.transition = animate ? "transform 650ms cubic-bezier(.2,.8,.2,1)" : "none";
      col.style.transform = `translateY(${-digit * 1.2}em)`;
    });
  }

  // --- Fetch via local proxy ---
  async function getFans() {
    const r = await fetch(`/api/bili/stat?vmid=${VMID}`, { cache: "no-store" });
    if (!r.ok) throw new Error("stat http " + r.status);
    const j = await r.json();
    const fans = j?.data?.follower;
    if (typeof fans !== "number") throw new Error("stat invalid");
    return fans;
  }

  async function getAvatar() {
    const r = await fetch(`/api/bili/acc?mid=${VMID}`, { cache: "no-store" });
    if (!r.ok) throw new Error("acc http " + r.status);
    const j = await r.json();
    const face = j?.data?.face;
    if (!face) throw new Error("acc invalid");
    return face;
  }

  async function refreshOnce() {
    const fansEl = $("#fansOdometer");
    const avatarEl = $("#avatarImg");

    try {
      const [fans, face] = await Promise.all([getFans(), getAvatar()]);
      if (avatarEl && face) avatarEl.src = face;
      if (fansEl) setOdometer(fansEl, fans, true);
    } catch (e) {
      // 首屏失败时，不要刷屏；留一条日志便于你排查
      console.warn("[bili] refresh failed:", e);
    }
  }

  const BiliStats = {
    init({ intervalMs = 15000 } = {}) {
      // 首次：无动画设置一次（避免从 0 轮转）
      const fansEl = $("#fansOdometer");
      if (fansEl) setOdometer(fansEl, 0, false);

      refreshOnce();
      window.setInterval(refreshOnce, clamp(intervalMs, 5000, 120000));
    },
  };

  window.BiliStats = BiliStats;
})();
