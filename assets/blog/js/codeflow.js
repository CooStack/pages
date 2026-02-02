// 代码流：读取 code.kt 并逐步打字 + 光标 + 自动滚动（让光标行尽量停在中间）
(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function escapeHtml(s) {
    return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  class CodeFlow {
    constructor({ url, codeEl, boxEl }) {
      this.url = url;
      this.codeEl = codeEl;
      this.boxEl = boxEl;

      this.fullText = '';
      this.typedText = '';
      this.cursor = document.createElement('span');
      this.cursor.className = 'cursor';

      this.lineHeights = 18;
      this.running = false;
    }

    async load() {
      try{
        const res = await fetch(this.url, { cache: 'no-store' });
        if(!res.ok) throw new Error('HTTP ' + res.status);
        this.fullText = await res.text();
      }catch(err){
        this.fullText = `// 读取 ${this.url} 失败：\n// ${String(err)}\n\n` +
          `// 你可以：\n// 1) 用本地服务器打开（VSCode Live Server）\n// 2) 确认 assets/blog/code.kt 存在\n\n` +
          `fun main(){\n    println("Hello, CodeFlow!")\n}\n`;
      }
    }

    render() {
      const safe = escapeHtml(this.typedText);
      this.codeEl.innerHTML = safe;
      this.codeEl.appendChild(this.cursor);
      this.keepCursorCentered();
    }

    keepCursorCentered() {
      // 把光标尽量保持在容器的中间行
      const box = this.boxEl;
      const cursorRect = this.cursor.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();

      // 光标相对 box 的 y
      const cursorY = cursorRect.top - boxRect.top + box.scrollTop;
      const target = cursorY - box.clientHeight / 2;
      box.scrollTop = Math.max(0, target);
    }

    async start() {
      if (this.running) return;
      this.running = true;

      await this.load();

      // 打字：随机按“字符/行”节奏
      const text = this.fullText.replaceAll('\r\n', '\n');
      let i = 0;

      while (i < text.length) {
        // 80% 概率打几个字符，20% 概率打一整行
        const roll = Math.random();
        if (roll < 0.20) {
          // 到下一行
          const nextNL = text.indexOf('\n', i);
          const end = nextNL === -1 ? text.length : nextNL + 1;
          this.typedText += text.slice(i, end);
          i = end;
          this.render();
          await sleep(650 + Math.random() * 700);
        } else {
          const chunk = 1 + Math.floor(Math.random() * 4);
          this.typedText += text.slice(i, i + chunk);
          i += chunk;
          this.render();
          await sleep(35 + Math.random() * 65);
        }

        // 每隔一段给一点“停顿”
        if (Math.random() < 0.06) {
          await sleep(300 + Math.random() * 500);
        }
      }

      // 打完后继续闪烁
      this.render();
    }
  }

  window.CodeFlow = CodeFlow;
})();
