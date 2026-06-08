const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best");
    const rushEl = document.getElementById("rush");
    const livesEl = document.getElementById("lives");
    const menu = document.getElementById("menu");
    const gameOver = document.getElementById("gameOver");
    const finalText = document.getElementById("finalText");
    const startBtn = document.getElementById("startBtn");
    const againBtn = document.getElementById("againBtn");
    const soundBtn = document.getElementById("soundBtn");
    const leftBtn = document.getElementById("leftBtn");
    const rightBtn = document.getElementById("rightBtn");

    const W = canvas.width;
    const H = canvas.height;
    const groundY = H - 96;
    const keys = new Set();
    const touch = { left: false, right: false };
    const rnd = (min, max) => Math.random() * (max - min) + min;

    let state;
    let last = 0;
    let raf = 0;
    let audioCtx = null;
    let muted = false;
    let best = Number(localStorage.getItem("kittyDashBest") || 0);
    bestEl.textContent = best;

    function makeState() {
      return {
        running: true,
        score: 0,
        lives: 3,
        rush: 0,
        rushTime: 0,
        spawn: 0,
        sparkle: [],
        items: [],
        clouds: Array.from({ length: 7 }, (_, i) => ({
          x: i * 165 + rnd(-30, 40),
          y: rnd(42, 190),
          s: rnd(0.65, 1.25),
          speed: rnd(8, 18)
        })),
        player: {
          x: W / 2,
          y: groundY - 74,
          w: 112,
          h: 92,
          vx: 0,
          blink: 0,
          hurt: 0
        }
      };
    }

    function beep(freq, duration, type = "sine", gain = 0.035) {
      if (muted) return;
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const vol = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      vol.gain.value = gain;
      osc.connect(vol);
      vol.connect(audioCtx.destination);
      osc.start();
      vol.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    }

    function drawHeart(x, y, size, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.beginPath();
      ctx.arc(0, -size / 2, size / 2, 0, Math.PI * 2);
      ctx.arc(-size / 2, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function roundedRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawCloud(x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.beginPath();
      ctx.arc(0, 20, 24, Math.PI, 0);
      ctx.arc(28, 13, 28, Math.PI, 0);
      ctx.arc(60, 20, 22, Math.PI, 0);
      ctx.rect(-26, 20, 110, 22);
      ctx.fill();
      ctx.restore();
    }

    function drawCafe() {
      ctx.fillStyle = "#f9c0d4";
      roundedRect(54, groundY - 104, 160, 104, 8);
      ctx.fill();
      ctx.fillStyle = "#fff6fb";
      roundedRect(74, groundY - 72, 44, 72, 6);
      ctx.fill();
      ctx.fillStyle = "#c5f2f9";
      roundedRect(132, groundY - 66, 52, 34, 6);
      ctx.fill();
      ctx.fillStyle = "#ff7faf";
      ctx.beginPath();
      ctx.moveTo(40, groundY - 104);
      ctx.lineTo(228, groundY - 104);
      ctx.lineTo(199, groundY - 152);
      ctx.lineTo(69, groundY - 152);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (let x = 63; x < 205; x += 36) {
        ctx.beginPath();
        ctx.arc(x, groundY - 104, 18, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "800 20px Trebuchet MS";
      ctx.fillText("CAFE", 99, groundY - 121);
    }

    function drawKitty(p) {
      const wiggle = Math.sin(performance.now() / 130) * 2;
      ctx.save();
      ctx.translate(p.x, p.y + wiggle);
      if (p.hurt > 0) ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 35) * 0.22;

      ctx.fillStyle = "#ff8eb9";
      roundedRect(-31, 44, 62, 44, 18);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 21, 52, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#59364b";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#59364b";
      ctx.lineWidth = 4;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 31, -8);
        ctx.lineTo(side * 52, -39);
        ctx.lineTo(side * 59, 4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#59364b";
      ctx.beginPath();
      ctx.ellipse(-20, 18, 5, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(20, 18, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe88c";
      ctx.strokeStyle = "#59364b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 31, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#59364b";
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(side * 29, 29 + i * 7);
          ctx.lineTo(side * 56, 22 + i * 9);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#ff5f9f";
      ctx.strokeStyle = "#59364b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(38, -18, 17, 13, -0.45, 0, Math.PI * 2);
      ctx.ellipse(61, -16, 17, 13, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(50, -15, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffbad2";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-28, 82, 13, 8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(28, 82, 13, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawCupcake(x, y, spin) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = "#f4a6c4";
      roundedRect(-19, -2, 38, 28, 5);
      ctx.fill();
      ctx.fillStyle = "#fff7f3";
      ctx.beginPath();
      ctx.arc(-12, -3, 15, Math.PI, 0);
      ctx.arc(4, -10, 18, Math.PI, 0);
      ctx.arc(16, -2, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff5f9f";
      ctx.beginPath();
      ctx.arc(2, -26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawStrawberry(x, y, spin) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = "#ff5f7e";
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.bezierCurveTo(-34, -2, -16, -28, 0, -14);
      ctx.bezierCurveTo(16, -28, 34, -2, 0, 26);
      ctx.fill();
      ctx.fillStyle = "#ffe88c";
      for (let i = 0; i < 7; i++) ctx.fillRect(rnd(-11, 11), rnd(-5, 14), 3, 4);
      ctx.fillStyle = "#5fc990";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-18, -30);
      ctx.lineTo(-6, -24);
      ctx.lineTo(0, -35);
      ctx.lineTo(6, -24);
      ctx.lineTo(18, -30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawDrop(x, y, spin) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = "#76c9f4";
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.bezierCurveTo(28, 4, 18, 30, 0, 30);
      ctx.bezierCurveTo(-18, 30, -28, 4, 0, -28);
      ctx.fill();
      ctx.restore();
    }

    function drawStar(x, y, spin) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = "#ffe88c";
      ctx.strokeStyle = "#f0b94d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 12 : 28;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function spawnItem() {
      const roll = Math.random();
      const type = roll < 0.18 ? "drop" : roll > 0.87 ? "star" : roll > 0.55 ? "berry" : "cupcake";
      state.items.push({
        type,
        x: rnd(55, W - 55),
        y: -42,
        r: type === "star" ? 31 : 30,
        vy: rnd(145, 220) + Math.min(state.score * 1.6, 180),
        spin: rnd(-0.4, 0.4)
      });
    }

    function sparkle(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        state.sparkle.push({
          x, y,
          vx: rnd(-120, 120),
          vy: rnd(-150, 35),
          life: rnd(0.25, 0.55),
          color,
          size: rnd(3, 8)
        });
      }
    }

    function setLives() {
      livesEl.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement("span");
        heart.className = "heart" + (i >= state.lives ? " empty" : "");
        livesEl.appendChild(heart);
      }
    }

    function collect(item) {
      if (item.type === "drop") {
        state.lives -= 1;
        state.player.hurt = 0.9;
        sparkle(item.x, item.y, "#76c9f4", 8);
        beep(140, 0.18, "sawtooth", 0.025);
        if (state.lives <= 0) endGame();
      } else {
        const value = item.type === "star" ? 12 : item.type === "berry" ? 7 : 5;
        const bonus = state.rushTime > 0 ? 2 : 1;
        state.score += value * bonus;
        state.rush = Math.min(100, state.rush + (item.type === "star" ? 28 : 13));
        sparkle(item.x, item.y, item.type === "star" ? "#ffe88c" : "#ff7faf", 12);
        beep(item.type === "star" ? 880 : 620, 0.09, "triangle", 0.03);
        if (state.rush >= 100 && state.rushTime <= 0) {
          state.rushTime = 5.5;
          state.rush = 0;
          beep(1040, 0.13, "triangle", 0.04);
          setTimeout(() => beep(1320, 0.13, "triangle", 0.035), 90);
        }
      }
      scoreEl.textContent = state.score;
      rushEl.textContent = state.rushTime > 0 ? "BONUS" : Math.floor(state.rush) + "%";
      setLives();
    }

    function endGame() {
      state.running = false;
      cancelAnimationFrame(raf);
      best = Math.max(best, state.score);
      localStorage.setItem("kittyDashBest", best);
      bestEl.textContent = best;
      finalText.textContent = `Score ${state.score}. Best ${best}. The cafe is glowing.`;
      gameOver.classList.remove("hidden");
    }

    function drawBackground(dt) {
      ctx.clearRect(0, 0, W, H);
      for (const cloud of state.clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.x > W + 100) cloud.x = -130;
        drawCloud(cloud.x, cloud.y, cloud.s);
      }
      drawCafe();
      ctx.fillStyle = "#9ce3bf";
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 3;
      for (let x = -20; x < W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 44);
        ctx.quadraticCurveTo(x + 25, groundY + 26, x + 50, groundY + 44);
        ctx.stroke();
      }
      for (let i = 0; i < 13; i++) {
        drawHeart(265 + i * 56, groundY + 37 + Math.sin(i) * 7, 10, i % 2 ? "#fff" : "#ffb3cf");
      }
      if (state.rushTime > 0) {
        ctx.fillStyle = "rgba(255, 232, 140, 0.18)";
        ctx.fillRect(0, 0, W, H);
      }
    }

    function update(dt) {
      const p = state.player;
      const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || touch.left;
      const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D") || touch.right;
      p.vx += ((right ? 1 : 0) - (left ? 1 : 0)) * 2200 * dt;
      p.vx *= Math.pow(0.0015, dt);
      p.x = Math.max(62, Math.min(W - 62, p.x + p.vx * dt));
      p.hurt = Math.max(0, p.hurt - dt);

      state.spawn -= dt;
      const rate = state.rushTime > 0 ? 0.24 : Math.max(0.37, 0.72 - state.score / 900);
      if (state.spawn <= 0) {
        spawnItem();
        state.spawn = rate;
      }

      state.rushTime = Math.max(0, state.rushTime - dt);
      if (state.rushTime <= 0) state.rush = Math.max(0, state.rush - dt * 3.8);

      for (const item of state.items) {
        item.y += item.vy * dt;
        item.spin += dt * (item.type === "drop" ? 1.5 : 2.4);
      }

      for (let i = state.items.length - 1; i >= 0; i--) {
        const item = state.items[i];
        const dx = item.x - p.x;
        const dy = item.y - (p.y + 28);
        if (Math.hypot(dx, dy) < item.r + 46) {
          state.items.splice(i, 1);
          collect(item);
        } else if (item.y > H + 60) {
          state.items.splice(i, 1);
        }
      }

      for (const s of state.sparkle) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 380 * dt;
        s.life -= dt;
      }
      state.sparkle = state.sparkle.filter(s => s.life > 0);
    }

    function render(dt) {
      drawBackground(dt);
      for (const item of state.items) {
        if (item.type === "drop") drawDrop(item.x, item.y, item.spin);
        if (item.type === "star") drawStar(item.x, item.y, item.spin);
        if (item.type === "berry") drawStrawberry(item.x, item.y, item.spin);
        if (item.type === "cupcake") drawCupcake(item.x, item.y, item.spin);
      }
      for (const s of state.sparkle) {
        ctx.globalAlpha = Math.max(0, s.life * 2);
        drawHeart(s.x, s.y, s.size, s.color);
        ctx.globalAlpha = 1;
      }
      drawKitty(state.player);
    }

    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
      last = now;
      if (state.running) {
        update(dt);
        render(dt);
        raf = requestAnimationFrame(loop);
      }
    }

    function start() {
      state = makeState();
      scoreEl.textContent = "0";
      rushEl.textContent = "0%";
      setLives();
      menu.classList.add("hidden");
      gameOver.classList.add("hidden");
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      beep(660, 0.08, "triangle", 0.025);
      setTimeout(() => beep(880, 0.08, "triangle", 0.025), 85);
    }

    function idle() {
      state = makeState();
      state.running = false;
      setLives();
      drawBackground(0);
      drawKitty(state.player);
    }

    function bindHold(btn, prop) {
      const on = event => { event.preventDefault(); touch[prop] = true; };
      const off = event => { event.preventDefault(); touch[prop] = false; };
      btn.addEventListener("pointerdown", on);
      btn.addEventListener("pointerup", off);
      btn.addEventListener("pointercancel", off);
      btn.addEventListener("pointerleave", off);
    }

    window.addEventListener("keydown", event => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) keys.add(event.key);
      if (event.key === " " && (!state || !state.running)) start();
    });
    window.addEventListener("keyup", event => keys.delete(event.key));
    startBtn.addEventListener("click", start);
    againBtn.addEventListener("click", start);
    soundBtn.addEventListener("click", () => {
      muted = !muted;
      soundBtn.textContent = muted ? "×" : "♪";
    });
    bindHold(leftBtn, "left");
    bindHold(rightBtn, "right");
    idle();