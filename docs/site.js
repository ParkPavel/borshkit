const repo = 'https://github.com/ParkPavel/borshkit/blob/main/';
const data = {
  current: [
    ['Контракт задачи', 'Цель становится проверяемой', 'Цель, границы файлов и критерии записаны в контракт. База фиксирует, от какой версии началась задача; --база позволяет выбрать коммит или ветку.', 'core/contract.mjs', 'Без критериев красивый ответ агента не доказывает, что задача выполнена.'],
    ['Контекст и знания', 'Важное — рядом с задачей', 'Роли, навыки, знания проекта и ограниченный diff помогают исполнителю понять работу. Новые текстовые файлы входят в пакет ревью внутри границ задачи.', 'core/jobs.mjs', 'Пакет ограничен. Пропущенное и обрезанное требует дополнительного чтения; карта кода статически разбирает JS/TS, Python, Go, Swift и Markdown.'],
    ['Исполнители', 'Среда меняется. Задача остаётся.', 'Borshkit запускает Claude Code, Codex, Gemini и API-исполнителей. Пишущий агент в Git-проекте получает отдельную рабочую копию.', 'core/adapters.mjs', 'VSIX использует нативные API Copilot/Roo/Cline. Отмена и статус Cline недоступны в публичном API; живые испытания отложены для пользователей.'],
    ['Проверки и приёмка', 'Результат с доказательствами', 'Команды проверок, независимое ревью и ручные подтверждения записываются отдельно. Доказательства относятся к точному состоянию файлов.', 'core/accept.mjs', 'Сбой запуска — UNKNOWN. Изменение файлов может сделать прежний PASS устаревшим. Ответ модели сам не принимает задачу.'],
    ['Передача работы', 'Продолжить с сохранёнными решениями', 'Единый пакет задачи сохраняет контракт, состояние, решения, контекст с происхождением и исторические ссылки на evidence. Импорт требует новых проверок.', 'core/handoff.mjs', 'Активный сеанс, ключи, процессы и доверенная приёмка между машинами не переносятся.']
  ],
  target: [
    ['Пользовательские испытания', 'От протокола к реальному опыту', 'Следующий этап: проверить конкретные версии моделей, аккаунты Roo/Cline/Copilot и физические устройства. Владелец отложил живые испытания до пользовательской обратной связи.', 'docs/roadmap.md', 'ПЛАН · Реализация и автоматические тесты не заменяют живой запуск.'],
    ['Семантическая карта', 'Более глубокий анализ связей', 'Следующий этап: расширить статическую карту до семантического анализа и условных/динамических импортов.', 'docs/roadmap.md', 'ПЛАН · Python, Go и Swift уже разбираются статически, неизвестное обозначается.'],
    ['Новые API сред', 'Достоверная отмена и наблюдение', 'Следующий этап: подключить достоверные операции отмены и статуса Cline, если среда предоставит соответствующий публичный API.', 'docs/roadmap.md', 'ПЛАН · Кнопки согласия не имитируются; неизвестное не превращается в успех.']
  ]
};
let mode = 'current';
const layers = document.querySelector('#layers');
function select(index) {
  const item = data[mode][index];
  layers.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  document.querySelector('#layer-meta').textContent = `${mode === 'current' ? 'РЕАЛИЗОВАНО' : 'ПЛАН'} / ${String(index + 1).padStart(2, '0')}`;
  document.querySelector('#layer-title').textContent = item[1];
  document.querySelector('#layer-description').textContent = item[2];
  document.querySelector('#layer-link').href = item[3].startsWith('docs/') ? 'read/' + item[3].slice(5).replace(/\.md$/, '.html') : repo + item[3];
  document.querySelector('#layer-link').textContent = mode === 'current' ? 'Посмотреть реализацию' : 'Открыть дорожную карту';
  document.querySelector('#layer-boundary').textContent = item[4];
}
function render() {
  document.querySelector('#map-content').setAttribute('aria-label', mode === 'current' ? 'Текущая архитектура' : 'Целевая архитектура — план');
  layers.replaceChildren(...data[mode].map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'layer'; button.setAttribute('aria-controls', 'layer-detail');
    const name = document.createElement('span');
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0'); number.className = 'layer-number'; number.setAttribute('aria-hidden', 'true');
    name.append(number, item[0]);
    button.append(name); button.addEventListener('click', () => select(index));
    return button;
  }));
  select(0);
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  render();
}));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const text = document.getElementById(button.dataset.copy).textContent;
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector('#copy-status').textContent = 'Команды скопированы';
    button.textContent = 'Скопировано';
    setTimeout(() => { button.textContent = 'Копировать'; }, 2500);
  } catch {
    document.querySelector('#copy-status').textContent = 'Копирование недоступно. Выдели команды в блоке и скопируй вручную.';
    button.textContent = 'Выдели текст';
  }
}));
document.querySelector('.map-shell').hidden = false;
render();
