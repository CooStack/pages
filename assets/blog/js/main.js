// 入口：初始化背景粒子、烟花、代码流、B站数据
(() => {
  const bg = document.getElementById('bg');

  // 上层烟花画布
  const fwCanvas = document.createElement('canvas');
  fwCanvas.id = 'fw';
  fwCanvas.style.position = 'fixed';
  fwCanvas.style.inset = '0';
  fwCanvas.style.width = '100%';
  fwCanvas.style.height = '100%';
  fwCanvas.style.zIndex = '1';
  fwCanvas.style.pointerEvents = 'none';
  document.body.appendChild(fwCanvas);

  // 背景粒子（底层）
  const field = new window.ParticleField(bg);
  function loop() {
    field.step();
    field.render();
    requestAnimationFrame(loop);
  }
  loop();

  // 烟花（上层）
  const fw = new window.Fireworks(fwCanvas);

  // 点击：在鼠标点击位置爆炸
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    fw.burst(e.clientX, e.clientY);
  });

  // 代码流
  const code = new window.CodeFlow({
    url: 'assets/blog/code.kt',
    codeEl: document.getElementById('codeContent'),
    boxEl: document.getElementById('codeBox')
  });
  code.start();

  // B站数据（头像 + 粉丝数）
  window.BiliStats.init({ intervalMs: 15000 });
})();
