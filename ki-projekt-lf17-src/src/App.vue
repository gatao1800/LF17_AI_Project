<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">Llama-Verdichter</div>
      <button class="new-chat" :disabled="loading" @click="newChat">+ Neues Diagramm</button>
      <p class="sidebar-note">Created with Love by IGD23</p>
    </aside>

    <main class="main">
      <header class="header">Mein KI-Chat</header>

      <section ref="chatContainer" class="conversation">
        <div v-if="messages.length === 0" class="welcome">
          <h1>Wobei kann ich dir helfen?</h1>
          <p>Lass uns ein Diagramm erstellen !</p>
        </div>

        <div v-else class="messages">
          <article
            v-for="(message, index) in messages"
            :key="index"
            class="message"
            :class="message.role"
          >
            <div class="avatar">
              {{ message.role === 'user' ? 'Du' : 'KI' }}
            </div>

            <div class="message-content">
              <strong>{{ message.role === 'user' ? 'Du' : 'Assistent' }}</strong>
              <p class="message-text">{{ message.content }}</p>

              <div v-if="message.diagramUrl" class="diagram">
                <img
                  :src="message.diagramUrl"
                  alt="Generiertes PlantUML-Diagramm"
                  @error="message.diagramError = true"
                />
                <p v-if="message.diagramError" class="error">
                  Das Diagramm konnte nicht geladen werden.
                </p>
              </div>
            </div>
          </article>

          <div v-if="loading" class="thinking">Llama antwortet …</div>
        </div>
      </section>

      <div class="composer-area">
        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <form class="composer" @submit.prevent="sendMessage">
          <textarea
            v-model="prompt"
            placeholder="Nachricht eingeben …"
            rows="2"
            :disabled="loading"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button type="submit" :disabled="loading || !prompt.trim()">Senden</button>
        </form>

        <p class="hint">Enter zum Senden · Shift + Enter für eine neue Zeile</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.app {
  display: flex;
  height: 100dvh;
  color: #ececf1;
  background: #212121;
  font-family: system-ui, sans-serif;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 20px;
  background: #171717;
}

.brand {
  margin-bottom: 24px;
  font-weight: 700;
}

.new-chat {
  width: 100%;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sidebar-note,
.hint {
  color: #999;
  font-size: 12px;
}

.sidebar-note {
  margin-top: 24px;
}

.main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.header {
  padding: 18px 24px;
  border-bottom: 1px solid #333;
  font-weight: 600;
}

.conversation {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome {
  display: grid;
  height: 100%;
  place-content: center;
  text-align: center;
}

.welcome p {
  color: #aaa;
}

.messages,
.composer-area {
  width: min(100%, 800px);
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 14px;
  margin-bottom: 28px;
}

.avatar {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: #444;
  font-size: 13px;
  font-weight: 700;
}

.assistant .avatar {
  background: #087f6c;
}

.message-content {
  min-width: 0;
}

.message-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.diagram {
  padding: 16px;
  border-radius: 12px;
  background: white;
}

.diagram img {
  display: block;
  max-width: 100%;
}

.thinking {
  color: #aaa;
}

.composer-area {
  padding: 0 24px 18px;
}

.composer {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 12px;
  border: 1px solid #555;
  border-radius: 16px;
  background: #303030;
}

textarea {
  flex: 1;
  resize: vertical;
  min-height: 48px;
  max-height: 200px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.composer button {
  padding: 10px 16px;
  border: 0;
  border-radius: 10px;
  background: #ececf1;
  color: #171717;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #f87171;
  overflow-wrap: anywhere;
}

.hint {
  text-align: center;
}

@media (max-width: 600px) {
  .sidebar {
    width: auto;
    padding: 12px;
  }

  .brand,
  .sidebar-note {
    display: none;
  }

  .conversation {
    padding: 16px;
  }
}
</style>
