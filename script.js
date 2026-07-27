if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (window.location.hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
window.scrollTo({ top: 0, behavior: "auto" });

const REMOTE_API_ROOT = window.SUBZERO_API_ROOT || "https://subzero-website-api.onrender.com";
const IS_FILE_PREVIEW = window.location.protocol === "file:";
const IS_LOCAL_HOST = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const IS_GITHUB_PAGES = window.location.hostname === "hongsewugui-cloud.github.io";
const API_ROOT = IS_FILE_PREVIEW ? "http://127.0.0.1:8765" : IS_GITHUB_PAGES ? REMOTE_API_ROOT : "";
const HAS_API = IS_FILE_PREVIEW || IS_LOCAL_HOST || IS_GITHUB_PAGES || window.location.protocol.startsWith("http");
const CONTENT_ENDPOINT = `${API_ROOT}/api/content`;
const intro = document.querySelector("#intro");
const skipIntro = document.querySelector("#skip-intro");
const replayIntro = document.querySelector("#replay-intro");
const menuPanel = document.querySelector("#menu-panel");
const menuTrigger = document.querySelector("#menu-trigger");
const menuClose = document.querySelector("#menu-close");
const backgroundMusic = document.querySelector("#background-music");
const musicToggle = document.querySelector("#music-toggle");
const menuLinks = document.querySelectorAll(".menu-links a");
const revealItems = document.querySelectorAll(".reveal");
const introAnimations = document.querySelectorAll(".launch-letter");
const reactiveGlyphs = document.querySelectorAll(".audio-word span");
const reactiveBars = document.querySelectorAll(".audio-field i");
const visualStage = document.querySelector("#visual-stage");
const waveButtons = document.querySelectorAll(".wave-button");
const interactiveControls = document.querySelectorAll(
  "button, .round-link, .wordmark, .menu-links a, .label-intro-link, .hero-button, .contact-card, .admin-button, .submit-button, .hub-tab"
);
const modal = document.querySelector("#contact-modal");
const modalOpeners = document.querySelectorAll("[data-open-modal='contact-modal']");
const modalClosers = document.querySelectorAll("[data-close-modal]");
const tabButtons = document.querySelectorAll(".hub-tab");
const tabPanels = document.querySelectorAll(".hub-panel");
const applyForm = document.querySelector("#member-apply-form");
const applyStatus = document.querySelector("#apply-status");
const focusSelect = document.querySelector("#focus-select");
const focusOtherWrap = document.querySelector("#focus-other-wrap");
const focusOtherInput = document.querySelector("#focus-other-input");
const releaseList = document.querySelector("#release-list");
const memberList = document.querySelector("#member-list");
const eventList = document.querySelector("#event-list");
const archiveList = document.querySelector("#archive-list");
const adminAccess = document.querySelector("#admin-access");
const adminLock = document.querySelector("#admin-lock");
const adminPanel = document.querySelector("#admin-panel");
const adminStatus = document.querySelector("#admin-status");
const submissionList = document.querySelector("#submission-list");
const publishedMemberList = document.querySelector("#published-member-list");
const adminShell = document.querySelector(".admin-shell");
const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let introDismissTimer;
let introHideTimer;
let waveResetTimer;
let musicEnabled = false;
let adminKey = sessionStorage.getItem("subzero-admin-key") || "";

const fallbackContent = {
  releases: [
    {
      title: "地下频段 / 发布筹备",
      summary: "整理首批公开页面内容，包含音乐、视觉和项目文案。",
      meta: ["音乐", "视觉", "进行中"],
    },
    {
      title: "冰层之下 / 项目推进",
      summary: "以音乐、插画、海报设计和概念设定同步构建虚拟世界。",
      meta: ["项目", "世界观", "持续更新"],
    },
  ],
  members: [
    {
      name: "SUBZERO 主理窗口",
      role: "联络 / 审核 / 发布",
      bio: "负责查看申请、沟通合作并决定哪些成员信息公开到网站。",
      contact: "微信 CH_576",
    },
  ],
  events: [
    {
      title: "线下碰头 / 预备中",
      summary: "优先从交流学习、小范围讨论和共创练习开始。",
      meta: ["社群", "线下", "筹备中"],
    },
  ],
  archives: [
    {
      title: "资料归档 / 新人友好",
      summary: "把视觉板、学习笔记、制作记录和参考链接集中整理。",
      meta: ["学习", "归档", "持续更新"],
    },
  ],
};

function dismissIntro() {
  if (intro.classList.contains("is-impact-transition") || intro.classList.contains("is-dismissed")) return;
  window.clearTimeout(introDismissTimer);
  intro.classList.add("is-impact-transition");
  document.body.classList.remove("intro-active");
  introHideTimer = window.setTimeout(() => intro.classList.add("is-dismissed"), 520);
}

function playIntro() {
  window.clearTimeout(introDismissTimer);
  window.clearTimeout(introHideTimer);
  document.body.classList.add("intro-active");
  intro.classList.remove("is-dismissed", "is-impact-transition");
  introAnimations.forEach((item) => {
    item.style.animation = "none";
    void item.offsetWidth;
    item.style.animation = "";
  });
  introDismissTimer = window.setTimeout(dismissIntro, 980);
}

introDismissTimer = window.setTimeout(dismissIntro, 980);
skipIntro.addEventListener("click", dismissIntro);
replayIntro.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(playIntro, 350);
});

function setMenu(open) {
  menuPanel.classList.toggle("is-open", open);
  menuPanel.setAttribute("aria-hidden", String(!open));
  menuTrigger.classList.toggle("is-menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

menuTrigger.addEventListener("click", () => setMenu(true));
menuClose.addEventListener("click", () => setMenu(false));
menuLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));

if (backgroundMusic && musicToggle) {
  backgroundMusic.volume = 0.34;
  musicToggle.addEventListener("click", async () => {
    if (musicEnabled) {
      backgroundMusic.pause();
      musicEnabled = false;
      musicToggle.textContent = "MUSIC OFF";
      musicToggle.setAttribute("aria-pressed", "false");
      musicToggle.classList.remove("is-playing");
      return;
    }
    try {
      await backgroundMusic.play();
      musicEnabled = true;
      musicToggle.textContent = "MUSIC ON";
      musicToggle.setAttribute("aria-pressed", "true");
      musicToggle.classList.add("is-playing");
    } catch (error) {
      musicEnabled = false;
      musicToggle.textContent = "CLICK AGAIN";
      musicToggle.setAttribute("aria-pressed", "false");
      musicToggle.classList.remove("is-playing");
      window.setTimeout(() => {
        if (!musicEnabled) musicToggle.textContent = "MUSIC OFF";
      }, 1400);
    }
  });
}

function triggerWave(kind) {
  window.clearTimeout(waveResetTimer);
  visualStage.classList.remove("wave-bass", "wave-kick", "wave-noise");
  void visualStage.offsetWidth;
  visualStage.classList.add(`wave-${kind}`);
  waveButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.wave === kind));
  waveResetTimer = window.setTimeout(() => {
    visualStage.classList.remove("wave-bass", "wave-kick", "wave-noise");
    waveButtons.forEach((button) => button.classList.remove("is-active"));
  }, 1100);
}

waveButtons.forEach((button) => {
  button.addEventListener("click", () => triggerWave(button.dataset.wave));
});

function animateControl(control) {
  if (motionReduced) return;
  control.classList.remove("is-clicked");
  void control.offsetWidth;
  control.classList.add("is-clicked");
  window.setTimeout(() => control.classList.remove("is-clicked"), 440);
}

interactiveControls.forEach((control) => {
  control.addEventListener("pointerdown", () => control.classList.add("is-pressed"));
  control.addEventListener("pointerup", () => control.classList.remove("is-pressed"));
  control.addEventListener("pointerleave", () => control.classList.remove("is-pressed"));
  control.addEventListener("click", () => animateControl(control));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.2 }
);

revealItems.forEach((item) => observer.observe(item));

function animateTypography(time) {
  const downbeat = Math.pow(Math.max(0, Math.sin(time * 0.0046)), 7);
  reactiveGlyphs.forEach((glyph, index) => {
    const wave = Math.sin(time * 0.003 + index * 1.31);
    const lift = Math.round(wave * (7 + downbeat * 19));
    const stretch = 1 + Math.max(0, wave) * 0.1 + downbeat * (index % 2 ? 0.16 : 0.08);
    glyph.style.setProperty("--lift", `${lift}px`);
    glyph.style.setProperty("--stretch", stretch.toFixed(3));
  });
  reactiveBars.forEach((bar, index) => {
    const wave = (Math.sin(time * 0.005 + index * 0.82) + 1) / 2;
    const height = Math.round(5 + wave * 18 + downbeat * (index % 3 === 0 ? 18 : 8));
    bar.style.setProperty("--bar-height", `${height}px`);
  });
  window.requestAnimationFrame(animateTypography);
}

if (!motionReduced) window.requestAnimationFrame(animateTypography);

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

modalOpeners.forEach((button) => button.addEventListener("click", openModal));
modalClosers.forEach((button) => button.addEventListener("click", closeModal));

function setActivePanel(panelName) {
  tabButtons.forEach((button) => {
    const active = button.dataset.panel === panelName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  tabPanels.forEach((panel) => {
    const active = panel.id === `panel-${panelName}`;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActivePanel(button.dataset.panel));
});

function renderCards(target, items, renderer) {
  target.innerHTML = "";
  if (!items.length) {
    target.innerHTML = "<div class='item-card'><strong>暂无内容</strong><p>这里会在整理后继续补充。</p></div>";
    return;
  }
  items.forEach((item) => target.appendChild(renderer(item)));
}

function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  card.innerHTML = `
    <strong>${item.title}</strong>
    <p>${item.summary}</p>
    <div class="item-meta">${(item.meta || []).map((entry) => `<span>${entry}</span>`).join("")}</div>
  `;
  return card;
}

function createMemberCard(member) {
  const card = document.createElement("article");
  card.className = "member-card";
  card.innerHTML = `
    <strong>${member.name}</strong>
    <p>${member.role}</p>
    <p>${member.bio}</p>
    <div class="member-meta"><span>${member.contact}</span></div>
  `;
  return card;
}

function renderContent(content) {
  renderCards(releaseList, content.releases || [], createItemCard);
  renderCards(memberList, content.members || [], createMemberCard);
  renderCards(eventList, content.events || [], createItemCard);
  renderCards(archiveList, content.archives || [], createItemCard);
}

function syncFocusOther() {
  const isOther = focusSelect.value === "其他";
  focusOtherWrap.hidden = !isOther;
  focusOtherInput.required = isOther;
  if (!isOther) focusOtherInput.value = "";
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "request failed");
  }
  return response.json();
}

async function loadPublicContent() {
  try {
    const response = await fetch(CONTENT_ENDPOINT);
    if (!response.ok) throw new Error("request failed");
    const payload = await response.json();
    renderContent(payload);
  } catch (error) {
    renderContent(fallbackContent);
  }
}

applyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(applyForm);
  const payload = Object.fromEntries(formData.entries());
  payload.focus = payload.focus === "其他" ? String(payload.focus_other || "").trim() : payload.focus;
  delete payload.focus_other;
  applyStatus.textContent = "正在提交申请…";
  try {
    await fetchJson("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    applyForm.reset();
    applyStatus.textContent = "申请已提交。现在只有主理人能在管理台看见，审核通过后才会公开到网站。";
  } catch (error) {
    applyStatus.textContent = HAS_API ? "提交失败。请稍后重试，或直接联系主理人微信 CH_576。" : "提交失败。当前页面还没有连接到申请服务。";
  }
});

focusSelect.addEventListener("change", syncFocusOther);
syncFocusOther();

function createSubmissionCard(entry) {
  const card = document.createElement("article");
  card.className = "submission-card";
  card.innerHTML = `
    <strong>${entry.name}</strong>
    <p>${entry.focus}</p>
    <p>${entry.bio}</p>
    <div class="submission-meta">
      <span>${entry.contact}</span>
      <span>${entry.status}</span>
      <span>${new Date(entry.created_at).toLocaleString("zh-CN")}</span>
    </div>
  `;
  const actions = document.createElement("div");
  actions.className = "submission-actions";
  const canRepublish = !entry.published_member_id && (entry.status === "approved" || entry.status === "removed");

  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.textContent = entry.published_member_id ? "已公开" : canRepublish ? "恢复公开" : "批准并公开";
  publishButton.disabled = Boolean(entry.published_member_id);
  publishButton.addEventListener("click", () => reviewSubmission(entry.id, "approved", true));

  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.textContent = canRepublish ? "仅保留批准" : "仅批准";
  approveButton.addEventListener("click", () => reviewSubmission(entry.id, "approved", false));

  const rejectButton = document.createElement("button");
  rejectButton.type = "button";
  rejectButton.textContent = "拒绝";
  rejectButton.addEventListener("click", () => reviewSubmission(entry.id, "rejected", false));

  actions.append(publishButton, approveButton, rejectButton);
  card.appendChild(actions);
  return card;
}

function createPublishedMemberCard(entry) {
  const card = document.createElement("article");
  card.className = "submission-card";
  card.innerHTML = `
    <strong>${entry.name}</strong>
    <p>${entry.role}</p>
    <p>${entry.bio}</p>
    <div class="submission-meta"><span>${entry.contact}</span></div>
  `;
  const actions = document.createElement("div");
  actions.className = "submission-actions";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "下架成员";
  removeButton.addEventListener("click", () => removePublishedMember(entry.id));
  actions.appendChild(removeButton);
  card.appendChild(actions);
  return card;
}

async function loadSubmissions() {
  if (!adminKey) return;
  adminStatus.textContent = "正在读取申请列表…";
  try {
    const payload = await fetchJson("/api/admin/submissions", {
      headers: { "X-Admin-Key": adminKey },
    });
    submissionList.innerHTML = "";
    if (!payload.submissions.length) {
      submissionList.innerHTML = "<div class='submission-card'><strong>暂无申请</strong><p>等有人提交后，这里会显示待审核内容。</p></div>";
    } else {
      payload.submissions.forEach((entry) => submissionList.appendChild(createSubmissionCard(entry)));
    }
    publishedMemberList.innerHTML = "";
    if (!payload.published_members.length) {
      publishedMemberList.innerHTML = "<div class='submission-card'><strong>暂无公开成员</strong><p>批准并公开后，成员会显示在这里。</p></div>";
    } else {
      payload.published_members.forEach((entry) => publishedMemberList.appendChild(createPublishedMemberCard(entry)));
    }
    adminStatus.textContent = "你现在看到的是申请列表。待审核内容不会出现在公开页面。";
  } catch (error) {
    adminStatus.textContent = "管理员口令不正确，或本地服务还没有启动。";
    adminPanel.hidden = false;
  }
}

async function reviewSubmission(id, decision, publish) {
  try {
    await fetchJson("/api/admin/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id, decision, publish }),
    });
    await Promise.all([loadSubmissions(), loadPublicContent()]);
  } catch (error) {
    adminStatus.textContent = "操作失败，请确认本地服务和管理员口令是否正确。";
  }
}

async function removePublishedMember(id) {
  try {
    await fetchJson("/api/admin/remove-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id }),
    });
    await Promise.all([loadSubmissions(), loadPublicContent()]);
  } catch (error) {
    adminStatus.textContent = "移除成员失败，请确认本地服务和管理员口令是否正确。";
  }
}

adminAccess.addEventListener("click", async () => {
  const input = window.prompt("输入管理员口令后查看待审核申请。");
  if (!input) return;
  adminKey = input.trim();
  sessionStorage.setItem("subzero-admin-key", adminKey);
  adminPanel.hidden = false;
  adminLock.hidden = false;
  await loadSubmissions();
});

adminLock.addEventListener("click", () => {
  adminKey = "";
  sessionStorage.removeItem("subzero-admin-key");
  adminPanel.hidden = true;
  adminLock.hidden = true;
  adminStatus.textContent = "管理台已关闭。";
});

if (adminKey) {
  adminPanel.hidden = false;
  adminLock.hidden = false;
  loadSubmissions();
}

loadPublicContent();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
    closeModal();
  }
});
