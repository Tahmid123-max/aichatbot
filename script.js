(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const menuBtn = document.getElementById('menu-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const themeToggle = document.getElementById('theme-toggle');
    const blueGlowToggle = document.getElementById('blue-glow-toggle');
    const inputForm = document.getElementById('input-form');

    const API_KEY = 'tgp_v1_8V75-FUeZupXDZJtUOewnH_odg2gmCHHNl7yoaGFxfM';
    const API_URL = 'https://api.together.xyz/v1/chat/completions';
    const TEXT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';

    let lastSentTime = 0;
    let isPremiumUser = false;
    let RATE_LIMIT_MS = 8000;

    const abusiveWords = ['sex','porn','sexy','sexual','nude','pussy','bichi','nunu','boob','fuck','fucking','sexi','shauwa','magernati','মাগী','খানকি','চোদ','চুদ','চোদা','চুদা','গান্ডু','গাধা','হারামি','বেশ্যা','কুত্তা','বোকাচোদা','বিছি','নুনু','মাদারচোদ','বসডা','শুয়োর','bastard','crap','shit','asshole','slut','whore','cunt','bimbo','prick','douche','dickhead','motherfucker','piss','skank','tramp','jerkoff','twat','moron','retard','scumbag','scum','loser','jackass','bitchass','suckass','dumbass','asswipe','cock','fucker','tit','লুঙ্গি খুলে','গোফজাদা','শালা','শালী','বোনচোদ','মা চোদা','লান্ড','পোঁদ','গুদ','হালারপুত','গাধাচোদা','নেংটা','গালি','fack','dick','blowjob','madarchod','khanki','magi','madartek','bokacoda','natkirpo','mangernati','shaua','suck','gand','gandu','lund','ass','boobs','hotgirl','sexygirl','chudiya','chud','shibal','pom pom','besshamagi','halarput','halarfo','halarfhut','bosdike'];
    const containsAbuse = text => abusiveWords.some(w => text.toLowerCase().includes(w));

    const limitKey = 'reply_limit';
    const dateKey = 'limit_date';
    const dailyLimit = 30;

    const premiumUsers = ['']; // Add more IPs here

    async function getUserIP() {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
      } catch {
        return 'unknown';
      }
    }

    async function checkPremium() {
      const ip = await getUserIP();
      isPremiumUser = premiumUsers.includes(ip);
      RATE_LIMIT_MS = isPremiumUser ? 2000 : 8000;
    }

    checkPremium();

    const messages = [{
      role: 'system',
      content: `You are a helpful AI chatbot made in Bangladesh. Your owner is Tahmid. Today is ${new Date().toDateString()} and the time is ${new Date().toLocaleTimeString()}. Be friendly and avoid abrasive content. Reply respectfully. Support multi-language understanding...` // truncated for brevity
    }];

    function appendMessage(text, className, withSuggestions = false) {
      const div = document.createElement('div');
      div.className = className;
      const span = document.createElement('span');
      span.textContent = text;
      div.appendChild(span);
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      return div;
    }

    function isOffline() {
      return !navigator.onLine;
    }

    function resetLimitIfNewDay() {
      const today = new Date().toDateString();
      const lastDate = localStorage.getItem(dateKey);
      if (lastDate !== today) {
        localStorage.setItem(limitKey, '0');
        localStorage.setItem(dateKey, today);
      }
    }

    async function checkLimit() {
      resetLimitIfNewDay();
      const ip = await getUserIP();
      const count = parseInt(localStorage.getItem(limitKey) || '0');
      const isWhitelisted = premiumUsers.includes(ip);
      if (count >= dailyLimit && !isWhitelisted) {
        appendMessage(`❌ You reached your daily (30 reply) limit...`, 'bot-message', true);
        return false;
      }
      if (!isWhitelisted) {
        localStorage.setItem(limitKey, (count + 1).toString());
        if (count + 1 === dailyLimit - 1) {
          appendMessage(`⚠️ Warning: You're on your last free reply (29/30).`, 'bot-message', true);
        }
      }
      return true;
    }

    async function sendMessage(text) {
      if (isOffline()) {
        appendMessage('❌ You are offline. Please check your internet connection.', 'bot-message', true);
        return;
      }
      if (!text.trim()) return;
      if (text.length > 3000) return appendMessage('⚠️ Message too long. Please shorten.', 'bot-message', true);
      if (containsAbuse(text)) return appendMessage('❌ Abuse detected. Message blocked.', 'bot-message', true);
      if (!await checkLimit()) return;

      messages.push({ role: 'user', content: text });
      appendMessage(text, 'user-message');
      const typingDiv = appendMessage('Typing...', 'bot-message');

      const lower = text.toLowerCase();
      if (lower.startsWith('wiki ') || lower.startsWith('উইকি ')) {
        const query = text.replace(/^(wiki|উইকি)\s+/i, '');
        const isBangla = /[\u0980-\u09FF]/.test(query);
        const lang = isBangla ? 'bn' : 'en';
        fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            typingDiv.remove();
            if (data.extract) {
              const div = document.createElement('div');
              div.className = 'bot-message';
              div.innerHTML = `📖 <b>${data.title}</b><br>${data.extract}`;
              if (data.thumbnail?.source) {
                const img = document.createElement('img');
                img.src = data.thumbnail.source;
                img.style.width = '100px';
                img.style.borderRadius = '10px';
                div.appendChild(document.createElement('br'));
                div.appendChild(img);
              }
              const link = document.createElement('a');
              link.href = data.content_urls.desktop.page;
              link.target = '_blank';
              link.textContent = '🔗 Read more';
              div.appendChild(document.createElement('br'));
              div.appendChild(link);
              chatBox.appendChild(div);
              chatBox.scrollTop = chatBox.scrollHeight;
            } else {
              appendMessage('❌ No Wikipedia article found.', 'bot-message', true);
            }
          })
          .catch(() => {
            typingDiv.remove();
            appendMessage('❌ Failed to fetch Wikipedia info.', 'bot-message', true);
          });
        return;
      }

      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages,
          temperature: isPremiumUser ? 0.3 : 0.2,
          max_tokens: isPremiumUser ? 550 : 600
        })
      })
        .then(res => res.json())
        .then(data => {
          typingDiv.remove();
          const reply = data.choices?.[0]?.message?.content || '❌ No reply. Try again later.';
          messages.push({ role: 'assistant', content: reply });
          appendMessage(reply, 'bot-message', true);
        })
        .catch(() => {
          typingDiv.remove();
          appendMessage('⚠️ AI is busy or network error. Try again.', 'bot-message', true);
        });
    }

    inputForm.addEventListener('submit', async e => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastSentTime < RATE_LIMIT_MS) {
        appendMessage('⚠️ You are sending too fast. Please slow down.', 'bot-message', true);
        return;
      }
      const msg = userInput.value;
      userInput.value = '';
      await sendMessage(msg);
      lastSentTime = now;
    });

    clearBtn.addEventListener('click', () => {
      chatBox.innerHTML = '';
      userInput.value = '';
    });

    menuBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));

    themeToggle.addEventListener('click', () => {
      const light = document.body.classList.toggle('light-mode');
      themeToggle.textContent = light ? '🌙 Dark Mode' : '☀️ Light Mode';
    });

    if (blueGlowToggle) {
      blueGlowToggle.addEventListener('click', () => {
        const glow = document.body.classList.toggle('blue-glow');
        blueGlowToggle.textContent = glow ? '🔧 Default Theme' : '💡 Blue Glow';
      });
    }

    appendMessage("Hi! I'm Ai ChatBot from Bangladesh. Ask me anything.", 'bot-message', true);
    userInput.focus();
    resetLimitIfNewDay();
  });
})();
